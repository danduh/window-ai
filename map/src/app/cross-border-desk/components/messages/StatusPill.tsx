// StatusPill — m.k==="s": centered system note pill (D§3c).
import type { Msg } from '../../types';
import { COLORS } from '../../tokens';

export function StatusPill({ m }: { m: Msg }) {
  return (
    <div style={{ alignSelf: 'center' }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.ink500,
          background: COLORS.canvas,
          borderRadius: 999,
          padding: '4px 14px',
        }}
      >
        {m.text}
      </div>
    </div>
  );
}
