#!/usr/bin/env node

// MCP Server Wrapper
import('./mcp-server.js').catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});