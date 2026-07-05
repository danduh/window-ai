// Frozen palette + shadow/font/mono constants for the Cross-Border Desk.
// Single import site for colors — every component applies these inline (D§0).
// Match hexes exactly — no approximations.

export const COLORS = {
  canvas: '#F1F2F7', white: '#FFFFFF', charcoal: '#1E1E28', charcoalHover: '#35353E',
  ink600: '#4B4B53', ink500: '#78787E', ink400: '#A5A5A9', border: '#D9D9D9',
  divider: '#E9E9E9', purple100: '#D5CBFF', purple200: '#C1B1FF', purple500: '#977DFF',
  electric500: '#0033FF', electric600: '#001AE5', electric100: '#99ADFF',
  midnight100: '#E5E9F1', midnight800: '#002373',
  scrim: 'rgba(30,30,40,0.45)', pillClose: 'rgba(30,30,40,0.12)',
  onDark55: 'rgba(255,255,255,0.55)', onDark70: 'rgba(255,255,255,0.7)',
} as const;

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const SHADOW_CARD_SOFT = 'var(--shadow-card-soft)';
export const FONT_BASE = 'var(--font-family-base)';
export const TRANSITION = 'background 160ms';
