// PrivacyCard — m.k==="p": dark "What crossed the network" card. Reads the
// settled minimal payload (4 monospace fields) + footer (D§3e).
import type { MinimalPayload } from '../../types';
import { COLORS, MONO } from '../../tokens';

const FIELD_ORDER: (keyof MinimalPayload)[] = [
  'recipient_token',
  'amount',
  'currency',
  'idempotency_key',
];

export function PrivacyCard({ payload }: { payload: MinimalPayload }) {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        width: '100%',
        maxWidth: 480,
        background: COLORS.charcoal,
        color: COLORS.white,
        borderRadius: 14,
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: COLORS.purple200,
          marginBottom: 12,
        }}
      >
        What crossed the network
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: MONO, fontSize: 13 }}>
        {FIELD_ORDER.map((key) => (
          <div key={key} style={{ display: 'flex', gap: 12 }}>
            <span style={{ color: COLORS.onDark55, width: 150, flex: 'none' }}>{key}</span>
            <span>{payload[key]}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${COLORS.ink600}`,
          fontSize: 13,
          color: COLORS.onDark70,
        }}
      >
        Never left the device: the invoice image, vendor name, bank details, line items, and every draft.
      </div>
    </div>
  );
}
