// Shared prop contracts for the /mcp-client demo panels.
//
// This is the FROZEN Phase 1 contract — McpClientPage owns the shared state
// and passes these props down to the three panels. Later phases implement the
// panel bodies against these exact interfaces; do not change the shapes.
import type { McpConnection, McpToolInfo } from '../../services/McpClientService';

/** Connection lifecycle state, owned by McpClientPage. */
export type McpStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** ConnectionPanel — URL + bearer token form; connect/disconnect controls. */
export interface ConnectionPanelProps {
  status: McpStatus;
  connection: McpConnection | null;
  error: string | null;
  /** OAuth authorize URL(s) when the server returned an McpAuthRequiredError. */
  authUrls?: string[];
  onConnect: (url: string, token: string) => void;
  onDisconnect: () => void;
}

/** ToolsPanel — list of the server's tools with per-tool enable + manual call. */
export interface ToolsPanelProps {
  tools: McpToolInfo[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  onCallManually: (name: string, args: Record<string, unknown>) => Promise<string>;
}

/** ChatPanel — built-in LLM agent loop that dispatches the SELECTED tools. */
export interface ChatPanelProps {
  tools: McpToolInfo[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<string>;
  connected: boolean;
}
