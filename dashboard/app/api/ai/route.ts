import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

export const runtime = "nodejs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  let mcpClient: Client | null = null;

  try {
    const { prompt } = await req.json();

    const serverPath = path.join(
      process.cwd(),
      "..",
      "mcp-server",
      "dist",
      "server.js"
    );

    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    mcpClient = new Client(
      { name: "dashboard-client", version: "1.0.0" },
      { capabilities: { sampling: {} } }
    );

    await mcpClient.connect(transport);

    const toolsResponse = await mcpClient.listTools();

    const tools = toolsResponse.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    // ---------- CLAUDE FIRST CALL ----------
    let firstResponse;

    try {
      firstResponse = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        tools,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
      });
    } catch {
      await mcpClient.close();

      return Response.json({
        reply: "AI service temporarily overloaded. Please try again.",
        data: [],
        chart: false,
      });
    }

    const contentArray = Array.isArray(firstResponse.content)
      ? firstResponse.content
      : [];

    const toolUse = contentArray.find(
      (c: any) => c.type === "tool_use"
    ) as any;

    // ---------- NO TOOL ----------
    if (!toolUse) {
      const textBlock = contentArray.find(
        (c: any) => c.type === "text"
      );

      await mcpClient.close();

      return Response.json({
        reply: textBlock?.text || "No response",
        data: [],
        chart: false,
      });
    }

    // ---------- TOOL EXECUTION ----------
    let toolText = "[]";
    let data: any[] = [];

    try {
      const toolResult = await mcpClient.callTool({
        name: toolUse.name,
        arguments: toolUse.input,
      });

      toolText =
        toolResult?.content?.[0]?.text ??
        JSON.stringify(toolResult.content ?? "[]");

      try {
        data = JSON.parse(toolText);
      } catch {}
    } catch {
      toolText = "[]";
    }

    // ---------- FINAL CLAUDE CALL ----------
    let finalText = "Query executed successfully.";

    try {
      const finalResponse = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
          {
            role: "assistant",
            content: contentArray,
          },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: toolText,
              },
            ],
          },
        ],
      });

      const textBlock = finalResponse.content.find(
        (c: any) => c.type === "text"
      );

      if (textBlock?.text) finalText = textBlock.text;
    } catch {}

    await mcpClient.close();

    const wantsChart =
      prompt.toLowerCase().includes("chart") ||
      prompt.toLowerCase().includes("graph") ||
      prompt.toLowerCase().includes("bar");

    return Response.json({
      reply: finalText,
      data,
      chart: wantsChart,
    });
  } catch (err) {
    console.error("FATAL:", err);

    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch {}
    }

    return Response.json({
      reply: "System is running, but AI tools are unavailable.",
      data: [],
      chart: false,
    });
  }
}
