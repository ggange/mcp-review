# Tools Documentation

This file documents all available tools provided by this MCP server.

## Tools

### `search_web`

Searches the web for information using a search engine. Returns relevant results with titles, URLs, and snippets.

**Arguments:**
- `query` (string, required): The search query
- `max_results` (number, optional): Maximum number of results to return (default: 10)

**Example:**
```json
{
  "query": "latest TypeScript features",
  "max_results": 5
}
```

---

### `fetch_url`

Fetches content from a URL and returns the HTML or text content.

**Arguments:**
- `url` (string, required): The URL to fetch
- `timeout` (number, optional): Request timeout in seconds (default: 30)

**Example:**
```json
{
  "url": "https://example.com/article",
  "timeout": 10
}
```

---

### `summarize_text`

Summarizes long text content into a concise summary.

**Arguments:**
- `text` (string, required): The text to summarize
- `max_length` (number, optional): Maximum length of summary in words (default: 100)

**Example:**
```json
{
  "text": "Long article content here...",
  "max_length": 50
}
```

---

## Alternative Format

You can also list tools in a simpler format:

- **`tool_name`**: Brief description of what the tool does
- **`another_tool`**: Another tool description
- **`yet_another`**: Yet another tool with its description
