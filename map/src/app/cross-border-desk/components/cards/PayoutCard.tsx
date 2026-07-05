// PayoutCard — "Payout instruction" halo (staged/settled), state pill, 4
// monospace fields (incl. local signature), staged/settled note (D§5e).
import type { PayoutData } from '../../types';
import { COLORS, MONO, SHADOW_CARD_SOFT } from '../../tokens';
import { SecurePayment } from '../../icons';

interface Props {
  payout: PayoutData;
  settled: boolean;
}

export function PayoutCard({ payout, settled }: Props) {
  const fields: { label: string; value: string }[] = [
    { label: 'amount', value: `${payout.amount} ${payout.currency}` },
    { label: 'recipient_token', value: payout.recipient_token },
    { label: 'idempotency_key', value: payout.idempotency_key },
    { label: 'signature', value: payout.signature },
  ];

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 20,
        boxShadow: SHADOW_CARD_SOFT,
        padding: 20,
      }}
    >
      {/* Header: halo + title + state pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: settled ? COLORS.electric100 : COLORS.purple200,
            color: COLORS.charcoal,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <SecurePayment size={22} />
        </div>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Payout instruction</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 999,
            padding: '4px 12px',
            flex: 'none',
            background: settled ? COLORS.electric500 : COLORS.purple200,
            color: settled ? COLORS.white : COLORS.charcoal,
          }}
        >
          {settled ? 'Settled' : 'Staged · offline'}
        </span>
      </div>

      {/* Fields */}
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontFamily: MONO,
          fontSize: 12.5,
        }}
      >
        {fields.map((f) => (
          <div key={f.label} style={{ display: 'flex' }}>
            <span style={{ width: 128, flex: 'none', color: COLORS.ink500 }}>{f.label}</span>
            <span>{f.value}</span>
          </div>
        ))}
      </div>

      {/* Note */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${COLORS.divider}`,
          fontSize: 13,
          color: COLORS.ink600,
          lineHeight: 1.45,
        }}
      >
        {settled
          ? 'Transmitted: the four fields above. The documents never left this device.'
          : "Signed and staged on this device. Idempotent — reconnecting can't double-send."}
      </div>
    </div>
  );
}
