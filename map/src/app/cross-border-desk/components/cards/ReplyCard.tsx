// ReplyCard — "Reply" + progressive tabs (Draft·EN/Formal/Polished/日本語) +
// pre-wrap body (D§5d). Tabs render only for non-null replies; selection uses
// the fixed index into the length-4 replies array.
import type { ReplyVariant } from '../../types';
import { COLORS, SHADOW_CARD_SOFT } from '../../tokens';

interface Props {
  replies: (ReplyVariant | null)[];
  replyIx: number;
  onSelectReply: (ix: number) => void;
}

export function ReplyCard({ replies, replyIx, onSelectReply }: Props) {
  const active = replies[replyIx];
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
        <span style={{ fontSize: 15, fontWeight: 600 }}>Reply</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.ink500 }}>
          Writer · Rewriter · Proofreader
        </span>
      </div>

      {/* Tabs — one per non-null reply, order fixed by index */}
      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {replies.map((reply, i) =>
          reply ? (
            <button
              key={reply.label}
              type="button"
              onClick={() => onSelectReply(i)}
              style={{
                border: `1px solid ${i === replyIx ? COLORS.charcoal : COLORS.border}`,
                background: i === replyIx ? COLORS.charcoal : COLORS.white,
                color: i === replyIx ? COLORS.white : COLORS.ink600,
                borderRadius: 999,
                padding: '4px 13px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {reply.label}
            </button>
          ) : null,
        )}
      </div>

      {/* Body */}
      {active && (
        <div
          style={{
            marginTop: 14,
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.55,
            background: COLORS.canvas,
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          {active.text}
        </div>
      )}
    </div>
  );
}
