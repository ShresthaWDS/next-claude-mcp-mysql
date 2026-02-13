import dotenv from "dotenv";
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import mysql from "mysql2/promise";

// Create server
const server = new Server(
  {
    name: "mysql-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// MySQL pool
const pool = mysql.createPool({
  host: "localhost",
  user: "mcp_user",
  password: "mcp_password",
  database: "world",
});


// MySQL pool using .env variables
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: Number(process.env.DB_PORT), // convert to number
// });

// Register tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "queryDatabase",
      description: "Run SQL query on MySQL",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  if (request.params.name === "queryDatabase") {
    console.log(
      "Received queryDatabase tool call with input:",
      request.params.arguments
    );

    const { query } = request.params.arguments;
    const [rows] = await pool.query(query);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(rows, null, 2),
        },
      ],
    };
  }

  throw new Error("Unknown tool");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
