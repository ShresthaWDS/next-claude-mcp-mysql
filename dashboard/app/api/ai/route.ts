import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

export const runtime = "nodejs"; // REQUIRED for MCP stdio

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  let mcpClient: Client | null = null;

  try {
    const { prompt } = await req.json();
    console.log("Received prompt:", prompt);

    // ✅ Resolve MCP server path
    const serverPath = path.join(
      process.cwd(),
      "..",
      "mcp-server",
      "dist",
      "server.js"
    );

    // ✅ Start MCP transport
    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    // ✅ Create MCP client
    mcpClient = new Client(
      { name: "dashboard-client", version: "1.0.0" },
      { capabilities: { sampling: {} } }
    );

    await mcpClient.connect(transport);

    // ✅ Get MCP tools
    const toolsResponse = await mcpClient.listTools();

    const tools = toolsResponse.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    // ✅ Initial Claude request
    const firstResponse = await anthropic.messages.create({
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

    // Check if Claude wants to use a tool
    const toolUse = firstResponse.content.find(
      (c: any) => c.type === "tool_use"
    ) as any;

    // 🔹 If NO tool use → just return text
    if (!toolUse) {
      const textBlock = firstResponse.content.find(
        (c: any) => c.type === "text"
      );

      await mcpClient.close();

      return Response.json({
        reply: textBlock?.text || "No response",
      });
    }

    // 🔹 Execute MCP tool
    const toolResult = await mcpClient.callTool({
      name: toolUse.name,
      arguments: toolUse.input,
    });

    // Format tool result safely
    const formattedResult =
      typeof toolResult.content === "string"
        ? toolResult.content
        : JSON.stringify(toolResult.content);

    // ✅ Second Claude call (CRITICAL STRUCTURE)
    const finalResponse = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [
        // 1️⃣ Original user message
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
        // 2️⃣ Assistant message WITH tool_use (DO NOT FILTER)
        {
          role: "assistant",
          content: firstResponse.content,
        },
        // 3️⃣ Tool result referencing tool_use.id
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: formattedResult,
            },
          ],
        },
      ],
    });

    const finalText = finalResponse.content.find(
      (c: any) => c.type === "text"
    );

    await mcpClient.close();

    return Response.json({
      reply: finalText?.text || "No response",
    });
  } catch (err) {
    console.error("MCP ERROR:", err);

    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch {}
    }

    return Response.json(
      { error: "AI request failed" },
      { status: 500 }
    );
  }
}
