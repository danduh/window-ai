export interface NavItem {
  /** Human label shown in the rail. */
  label: string;
  /** Route prefix this item points at. */
  href: string;
}

/** The rail navigation, in order, matching the Home Redesign design. */
export const RAIL_NAV: NavItem[] = [
  { label: 'Chat', href: '/chat' },
  { label: 'Tool Calling', href: '/tool-calling' },
  { label: 'Multimodal', href: '/multimodal' },
  { label: 'Summary', href: '/summary' },
  { label: 'Translate', href: '/translate' },
  { label: 'Live Translate', href: '/live-translate' },
  { label: 'Writer/Rewriter', href: '/writer' },
  { label: 'Proofreader', href: '/proofreader' },
  { label: 'Embeddings', href: '/embeddings' },
  { label: 'WebMCP', href: '/webmcp' },
  { label: 'MCP Client', href: '/mcp-client' },
  { label: 'Generative UI', href: '/generative-ui' },
];

/** First-letter chip shown in the collapsed rail. */
export const navLetter = (label: string): string =>
  label.charAt(0).toUpperCase();

/**
 * True when `pathname` belongs to `href` (exact, or a nested route such as
 * `/chat/chat-api-documentation`).
 */
export const matchesRoute = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

/** Top-bar title derived from the active route. Home → "Overview". */
export const titleForPath = (pathname: string): string => {
  if (pathname === '/') return 'Overview';
  const hit = RAIL_NAV.find((n) => matchesRoute(pathname, n.href));
  return hit ? hit.label : 'Overview';
};
