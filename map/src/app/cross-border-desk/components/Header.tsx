// Header — 60px header: logo, divider, title, on-device pill, spacer, tier
// pill, network toggle button (D§2).
import type { Tier } from '../types';
import { COLORS, TRANSITION } from '../tokens';
import logo from '../../../assets/payoneer-logo.png';

interface Props {
  tier: Tier;
  online: boolean;
  onToggleNet: () => void;
}

export function Header({ tier, online, onToggleNet }: Props) {
  const tierText = tier === 3 ? 'Tier 3 · mock brain' : 'Tier 1 · on-device Nano';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 24px',
        height: 60,
        background: COLORS.white,
        borderBottom: `1px solid ${COLORS.divider}`,
        flex: 'none',
      }}
    >
      <img src={logo} alt="Payoneer" style={{ height: 22, width: 'auto', display: 'block' }} />
      <div style={{ width: 1, height: 24, background: COLORS.divider }} />
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
        Cross-Border Desk
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.ink600,
          background: COLORS.canvas,
          borderRadius: 999,
          padding: '4px 12px',
        }}
      >
        On-device · Chrome built-in AI
      </span>

      <span style={{ flex: 1 }} />

      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.ink500,
          border: `1px solid ${COLORS.divider}`,
          borderRadius: 999,
          padding: '4px 12px',
        }}
      >
        {tierText}
      </span>

      <button
        type="button"
        onClick={onToggleNet}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: 'none',
          cursor: 'pointer',
          borderRadius: 999,
          padding: '7px 16px',
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.white,
          background: online ? COLORS.electric500 : COLORS.charcoal,
          transition: TRANSITION,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: online ? COLORS.electric100 : COLORS.purple500,
          }}
        />
        {online ? 'Network on' : 'Network off — airplane'}
      </button>
    </header>
  );
}
