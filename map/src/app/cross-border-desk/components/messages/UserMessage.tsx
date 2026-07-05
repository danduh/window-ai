// UserMessage — m.k==="u": right-aligned charcoal bubble, optional invoice
// attachment card rendered above it (D§3a).
import type { Msg } from '../../types';
import { COLORS, SHADOW_CARD_SOFT } from '../../tokens';
import { InvoiceAttachmentCard } from './InvoiceAttachmentCard';

export function UserMessage({ m }: { m: Msg }) {
  return (
    <div
      style={{
        alignSelf: 'flex-end',
        maxWidth: '72%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {m.att &&
        (m.att.kind === 'sample' ? (
          // Demo sample → the stylized 請求書 card (design fixture).
          <InvoiceAttachmentCard att={m.att} />
        ) : (
          // Uploaded / captured image → show the actual attached image.
          <div
            style={{
              width: 220,
              background: COLORS.white,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              boxShadow: SHADOW_CARD_SOFT,
              padding: 8,
            }}
          >
            <img
              src={m.att.dataUrl}
              alt={m.att.file}
              style={{
                width: '100%',
                borderRadius: 8,
                display: 'block',
                maxHeight: 300,
                // contain (not cover) so a portrait invoice photo isn't cropped —
                // the thumbnail matches exactly what the multimodal extract reads.
                objectFit: 'contain',
                background: COLORS.canvas,
              }}
            />
            <div style={{ fontSize: 10, color: COLORS.ink400, marginTop: 6 }}>{m.att.file}</div>
          </div>
        ))}
      <div
        style={{
          background: COLORS.charcoal,
          color: COLORS.white,
          borderRadius: '14px 14px 4px 14px',
          padding: '10px 16px',
          fontSize: 15,
          lineHeight: 1.45,
        }}
      >
        {m.text}
      </div>
    </div>
  );
}
