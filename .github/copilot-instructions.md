# window-ai Copilot Instructions

This project demonstrates Chrome's built-in AI capabilities through a multi-app monorepo showcasing various AI APIs including chat, translation, summarization, and tool calling.

## Architecture Overview

### Nx Monorepo Structure
- **chat/**: React SPA with AI demos (main application)
- **chrome-llm-ts/**: TypeScript library for Chrome AI API interfaces
- **mcp/**: Model Context Protocol server for payment demos
- **mcp-client/**: MCP client implementation
- **ai-docs/**: MkDocs documentation site

### Key Technology Stack
- **Build System**: Nx 21.4.1 with Vite for React apps, esbuild for Node services
- **Frontend**: React 19.1.1 with React Router, Tailwind CSS for styling
- **AI Integration**: Chrome's `window.ai` API (Prompt API, Translation API, etc.)
- **Backend**: MCP (Model Context Protocol) for structured AI tool calling

## Development Workflows

### Build Commands (from root)
```bash
# Build chat app
nx build chat
npm run build:chat

# Serve locally
nx serve chat
npm run serve:chat

# SEO-optimized build with prerendering
npm run build:seo
```

### MCP Server Development
```bash
# Build and serve MCP server
nx build mcp
nx serve mcp

# Test with inspector
cd mcp && npm run test-with-inspector
```

## Critical Patterns & Conventions

### Chrome AI API Integration
- **Global Types**: All Chrome AI APIs declared in `chat/src/global.d.ts`
- **Service Pattern**: AI services in `chat/src/app/services/` wrap Chrome APIs
- **Availability Checking**: Always check `LanguageModel.availability()` before use
- **Session Management**: Create/destroy sessions properly to manage memory

Example from `ChatAIService.ts`:
```typescript
const session = await LanguageModel.create({
  initialPrompts: [{ role: "system", content: systemPrompt }]
});
```

### SEO & Prerendering
- **Production Routing**: Uses `/window-ai/` basename in production (GitHub Pages)
- **Prerendering**: `chat/scripts/prerender.js` generates static HTML for all routes
- **Meta Management**: `SEOHead.tsx` component handles dynamic meta tags per route

### Component Architecture
- **Route-based Features**: Each AI demo is a separate route/component
- **Shared UI**: Common components in `chat/src/app/components/`
- **Context Pattern**: Theme and app state managed via React Context
- **iframe Support**: Components detect and adapt to iframe embedding (`?inIframe=true`)

### MCP (Model Context Protocol) Integration
- **Server Structure**: Tools defined in `mcp/src/main.ts` with JSON schemas
- **Payment Demo**: Mock payment system with balance validation and transfers
- **Client Integration**: MCP client in `mcp-client/` connects to server tools

## File Organization Rules

### TypeScript Library (`chrome-llm-ts/`)
- **Exports**: All public APIs exported through `src/index.ts`
- **Interfaces**: Core types in `src/lib/interfaces.ts`
- **Service Classes**: Feature-specific classes (summary, translation, writer)

### Chat App Structure
```
chat/src/app/
├── components/     # React components (one per AI feature)
├── services/       # Chrome AI API wrappers
├── context/        # React context providers
├── types/          # TypeScript definitions
├── tools/          # Utility functions
└── utils/          # Helper functions
```

## Build Configuration Notes

### Vite Config (`chat/vite.config.ts`)
- **Markdown Loading**: Custom plugin transforms `.md` files to strings
- **Code Splitting**: Manual chunks for vendor and UI libraries
- **Asset Handling**: Nx plugins for TypeScript paths and asset copying

### Nx Configuration
- **Target Dependencies**: Build tasks properly depend on dependencies
- **Multiple Build Tools**: Supports Vite, Webpack, and esbuild per project needs
- **Plugin System**: Uses Nx plugins for consistent tooling across projects

## Deployment & Distribution

### GitHub Pages Deployment
- **Base Path**: Production builds use `/window-ai/` basename
- **Static Generation**: Prerendering creates SEO-friendly static files
- **Documentation**: Separate MkDocs site built via Amplify

### Package Distribution
- **NPM Library**: `chrome-llm-ts` designed for external consumption
- **Type Declarations**: Proper TypeScript support for library consumers

When working with this codebase, prioritize understanding the Chrome AI API integration patterns and the SEO prerendering workflow, as these are the most project-specific aspects that differ from typical React applications.