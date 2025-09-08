# Tool Calling API Documentation

The Chrome AI Tool Calling API allows language models to interact with external functions, enabling powerful integrations with your application's capabilities.

## Overview

Tool calling enables the AI model to:
- Execute JavaScript functions when needed
- Access external data sources
- Perform calculations and computations
- Interact with APIs and services
- Provide real-time information

## Basic Usage

### Creating a Session with Tools

```javascript
const session = await LanguageModel.create({
  initialPrompts: [{
    role: "system",
    content: "You are a helpful assistant with access to various tools."
  }],
  tools: [
    {
      name: "getWeather",
      description: "Get the weather in a location.",
      inputSchema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city to check for weather condition.",
          },
        },
        required: ["location"],
      },
      async execute({ location }) {
        const response = await fetch(`https://api.weather.com/v1/current?location=${location}`);
        return JSON.stringify(await response.json());
      },
    }
  ]
});
```

### Tool Definition Structure

Each tool must include:

- **name**: Unique identifier for the tool
- **description**: What the tool does (used by AI to decide when to call it)
- **inputSchema**: JSON Schema defining the expected parameters
- **execute**: JavaScript function that performs the actual work

## Input Schema

The `inputSchema` follows JSON Schema specification:

```javascript
{
  type: "object",
  properties: {
    paramName: {
      type: "string|number|boolean|array|object",
      description: "Description of what this parameter does"
    }
  },
  required: ["paramName"] // Optional array of required parameters
}
```

### Supported Types

- `string`: Text values
- `number`: Numeric values
- `boolean`: True/false values
- `array`: Lists of values
- `object`: Complex nested structures

## Execute Function

The `execute` function:
- Receives parameters as destructured arguments
- Must return a string (use `JSON.stringify()` for objects)
- Can be async
- Should handle errors gracefully

```javascript
async execute({ param1, param2 }) {
  try {
    const result = await someAsyncOperation(param1, param2);
    return JSON.stringify({
      success: true,
      data: result
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
}
```

## Example Tools

### Weather Tool

```javascript
{
  name: "getWeather",
  description: "Get current weather for a location",
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name or coordinates"
      }
    },
    required: ["location"]
  },
  async execute({ location }) {
    // Simulate API call
    return JSON.stringify({
      location,
      temperature: "22°C",
      condition: "Sunny",
      humidity: "45%"
    });
  }
}
```

### Calculator Tool

```javascript
{
  name: "calculate",
  description: "Perform mathematical calculations",
  inputSchema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Mathematical expression to evaluate"
      }
    },
    required: ["expression"]
  },
  async execute({ expression }) {
    try {
      const result = eval(expression); // Use proper math library in production
      return JSON.stringify({
        expression,
        result: result.toString()
      });
    } catch (error) {
      return JSON.stringify({
        error: "Invalid expression"
      });
    }
  }
}
```

### Time Tool

```javascript
{
  name: "getCurrentTime",
  description: "Get current date and time",
  inputSchema: {
    type: "object",
    properties: {
      timezone: {
        type: "string",
        description: "Timezone (optional)"
      }
    }
  },
  async execute({ timezone }) {
    const now = new Date();
    return JSON.stringify({
      timestamp: now.toISOString(),
      localTime: now.toLocaleString(),
      timezone: timezone || "local"
    });
  }
}
```

## Concurrent Tool Calls

The AI model can call multiple tools simultaneously:

```javascript
// User: "What's the weather in Seattle, Tokyo, and Berlin?"
// The model might call getWeather three times concurrently
```

The system waits for all tool calls to complete before generating the final response.

## Best Practices

### Tool Design

1. **Clear Descriptions**: Help the AI understand when to use each tool
2. **Specific Schemas**: Define precise parameter requirements
3. **Error Handling**: Always handle and return errors gracefully
4. **JSON Responses**: Return structured data as JSON strings

### Performance

1. **Async Operations**: Use async/await for API calls
2. **Timeout Handling**: Implement timeouts for external calls
3. **Caching**: Cache results when appropriate
4. **Rate Limiting**: Respect API rate limits

### Security

1. **Input Validation**: Validate all parameters
2. **Sanitization**: Clean user inputs
3. **API Keys**: Store securely, don't expose in client code
4. **CORS**: Handle cross-origin requests properly

## Error Handling

Tools should return error information in a consistent format:

```javascript
async execute({ param }) {
  try {
    const result = await riskyOperation(param);
    return JSON.stringify({ success: true, data: result });
  } catch (error) {
    return JSON.stringify({ 
      success: false, 
      error: error.message,
      code: error.code 
    });
  }
}
```

## Advanced Examples

### Database Query Tool

```javascript
{
  name: "queryDatabase",
  description: "Query the user database",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "SQL query to execute"
      },
      limit: {
        type: "number",
        description: "Maximum number of results"
      }
    },
    required: ["query"]
  },
  async execute({ query, limit = 10 }) {
    // Implement secure database querying
    const results = await db.query(query, { limit });
    return JSON.stringify({
      query,
      results,
      count: results.length
    });
  }
}
```

### File System Tool

```javascript
{
  name: "readFile",
  description: "Read contents of a file",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Path to the file to read"
      }
    },
    required: ["filepath"]
  },
  async execute({ filepath }) {
    try {
      const content = await fs.readFile(filepath, 'utf8');
      return JSON.stringify({
        filepath,
        content,
        size: content.length
      });
    } catch (error) {
      return JSON.stringify({
        error: `Failed to read file: ${error.message}`
      });
    }
  }
}
```

## Integration Tips

### With React State

```javascript
const [tools, setTools] = useState([
  {
    name: "updateCounter",
    description: "Update the counter value",
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "number", description: "New counter value" }
      },
      required: ["value"]
    },
    async execute({ value }) {
      setCounter(value); // Update React state
      return JSON.stringify({ counter: value });
    }
  }
]);
```

### With External APIs

```javascript
{
  name: "searchWeb",
  description: "Search the web for information",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" }
    },
    required: ["query"]
  },
  async execute({ query }) {
    const response = await fetch(`https://api.search.com/v1/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return JSON.stringify({
      query,
      results: data.results.slice(0, 5) // Limit results
    });
  }
}
```

## Debugging Tools

### Logging Tool Calls

```javascript
async execute(params) {
  console.log(`Tool ${this.name} called with:`, params);
  const result = await actualWork(params);
  console.log(`Tool ${this.name} returned:`, result);
  return result;
}
```

### Test Mode

```javascript
const isTestMode = process.env.NODE_ENV === 'test';

async execute({ location }) {
  if (isTestMode) {
    return JSON.stringify({ location, temperature: "20°C", condition: "Test" });
  }
  
  // Real implementation
  const weather = await fetchRealWeather(location);
  return JSON.stringify(weather);
}
```

## Limitations

1. **Return Type**: Tools must return strings
2. **Serialization**: Complex objects need JSON.stringify()
3. **Async Only**: All tool functions are treated as async
4. **Browser Security**: Some APIs may not be available in browser context
5. **Memory**: Large responses may impact performance

## Troubleshooting

### Common Issues

1. **Tool Not Called**: Check description clarity and parameter schema
2. **Invalid Parameters**: Verify schema matches expected input
3. **Execution Errors**: Implement proper error handling
4. **Performance Issues**: Optimize async operations and add timeouts

### Debug Checklist

- [ ] Tool description is clear and specific
- [ ] Input schema matches actual parameters
- [ ] Execute function handles all parameter combinations
- [ ] Error cases return proper JSON responses
- [ ] Async operations have timeouts
- [ ] Return values are properly stringified

This API enables powerful integrations between AI models and your application's functionality, opening up endless possibilities for intelligent automation and user assistance.
