# n8n MCP & Skills Setup Guide

## 1. Configure n8n MCP Server

To enable the n8n MCP server, you need to add the following configuration to your MCP settings file.

**For Claude Desktop:**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json` and add:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "n8n-mcp"
      ],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true"
      }
    }
  }
}
```

> [!NOTE]
> If you have a self-hosted n8n instance or want to manage workflows, add `N8N_API_URL` and `N8N_API_KEY` to the `env` object.

## 2. Installed Skills

The following skills have been installed in `.agent/skills`:

- **n8n Expression Syntax**
- **n8n MCP Tools Expert**
- **n8n Workflow Patterns**
- **n8n Validation Expert**
- **n8n Node Configuration**
- **n8n Code JavaScript**
- **n8n Code Python**

## 3. Usage

After configuring the MCP server and restarting your assistant/IDE, you can ask for help with n8n workflows, and the assistant will utilize these skills and the MCP tools.
