// ToolChipMessage — m.k==="t": tool chip with status dot, name, api label,
// optional "mock" tag, phase pill, and result line (D§3d, §5).
import type { Msg } from '../../types';
import { COLORS, MONO } from '../../tokens';

function dotColor(status: Msg['status']): string {
  if (status === 'error') return COLORS.charcoal;
  if (status === 'done') return COLORS.purple500;
  return COLORS.electric500; // running
}

export function ToolChipMessage({ m }: { m: Msg }) {
  const running = m.status === 'running';
  const online = m.phase === 'online';
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        width: '100%',
        maxWidth: 480,
        border: `1px solid ${COLORS.divider}`,
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotColor(m.status),
            animation: running ? 'cbd-pulse 1s infinite' : undefined,
            flex: 'none',
          }}
        />
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{m.tool}</span>
        <span style={{ fontSize: 12, color: COLORS.ink500 }}>{m.api}</span>
        {m.mocked && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.ink500,
              background: COLORS.canvas,
              borderRadius: 999,
              padding: '1px 7px',
            }}
          >
            mock
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 999,
            padding: '2px 10px',
            background: online ? COLORS.electric500 : COLORS.purple200,
            color: online ? COLORS.white : COLORS.charcoal,
          }}
        >
          {online ? 'network' : 'on-device'}
        </span>
      </div>
      {/* Result line */}
      {m.result && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12,
            paddingLeft: 18,
            color: m.status === 'error' ? COLORS.charcoal : COLORS.ink500,
          }}
        >
          {m.result}
        </div>
      )}
    </div>
  );
}
