// GistCard — "The gist" + 4 purple-bulleted key points (D§5c).
import { COLORS, SHADOW_CARD_SOFT } from '../../tokens';

export function GistCard({ summary }: { summary: string[] }) {
  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 20,
        boxShadow: SHADOW_CARD_SOFT,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>The gist</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.ink500 }}>Summarizer</span>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {summary.map((point) => (
          <div key={point} style={{ display: 'flex', gap: 10 }}>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: COLORS.purple500,
                flex: 'none',
                marginTop: 7,
              }}
            />
            <span style={{ fontSize: 14, lineHeight: 1.45 }}>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
