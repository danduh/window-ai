// InvoiceAttachmentCard — the 220px JA attachment card rendered inside
// UserMessage when m.att is set (D§3a). Static Japanese fixture content.
import type { AttachmentRef } from '../../types';
import { COLORS, SHADOW_CARD_SOFT } from '../../tokens';

const LINES: { desc: string; amt: string }[] = [
  { desc: 'LPデザイン一式', amt: '¥260,000' },
  { desc: 'バナー制作 8点', amt: '¥96,000' },
  { desc: '修正対応（2ラウンド）', amt: '¥80,000' },
  { desc: '消費税 10%', amt: '¥43,600' },
];

export function InvoiceAttachmentCard({ att }: { att: AttachmentRef }) {
  return (
    <div
      style={{
        width: 220,
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: SHADOW_CARD_SOFT,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>請求書</div>
      <div style={{ fontSize: 10, color: COLORS.ink600 }}>
        佐藤デザイン事務所 · INV-2026-0614
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {LINES.map((l) => (
          <div
            key={l.desc}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9,
              color: COLORS.ink500,
            }}
          >
            <span>{l.desc}</span>
            <span>{l.amt}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: `1px solid ${COLORS.divider}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        <span>合計</span>
        <span>¥479,600</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: COLORS.ink400 }}>{att.file}</div>
    </div>
  );
}
