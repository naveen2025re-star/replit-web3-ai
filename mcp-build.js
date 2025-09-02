#!/usr/bin/env node

import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync, chmodSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildMcpServer() {
  try {
    // Ensure build directory exists
    const buildDir = join(__dirname, "build");
    if (!existsSync(buildDir)) {
      mkdirSync(buildDir, { recursive: true });
    }

    // Build the MCP server
    await build({
      entryPoints: [join(__dirname, "server/mcpServer.ts")],
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      outfile: join(__dirname, "build/mcp-server.js"),
      external: [],
      packages: "bundle",
      // Remove shebang for ESM format
      sourcemap: false,
      minify: false,
      mainFields: ["main", "module"],
      conditions: ["node"],
    });

    // Make the built file executable
    chmodSync(join(__dirname, "build/mcp-server.js"), 0o755);

    console.log("✅ MCP server built successfully!");
    console.log("📁 Output: build/mcp-server.js");
    console.log("🚀 Ready to use with Claude Desktop or VS Code!");
    
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

buildMcpServer();