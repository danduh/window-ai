// ConfirmDialog — scrim + dialog for queue|settle: title/body/data-box/
// Cancel/OK variants (D§7).
import { useState } from 'react';
import type { ConfirmKind } from '../types';
import { COLORS, MONO, SHADOW_CARD_SOFT } from '../tokens';

interface Props {
  kind: ConfirmKind;
  onResolve: (ok: boolean) => void;
}

interface Variant {
  title: string;
  body: string;
  cta: string;
}

const VARIANTS: Record<ConfirmKind, Variant> = {
  queue: {
    title: 'Queue this payout?',
    body: 'Signs and stages the instruction on this device. Nothing is transmitted until you settle.',
    cta: 'Queue payout',
  },
  settle: {
    title: 'Settle this payout?',
    body: 'Transmits the three fields below (plus currency) to the payment rail. No documents, no PII.',
    cta: 'Settle now',
  },
};

const DATA_ROWS: { label: string; value: string }[] = [
  { label: 'amount', value: '479600 JPY · ≈ $2,973.71' },
  { label: 'recipient_token', value: 'rcp_7f3a…9c21' },
  { label: 'idempotency_key', value: 'idk_9f2e41ac-07c2' },
];

export function ConfirmDialog({ kind, onResolve }: Props) {
  const variant = VARIANTS[kind];
  const [cancelHover, setCancelHover] = useState(false);
  const [okHover, setOkHover] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: COLORS.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: COLORS.white,
          borderRadius: 20,
          boxShadow: SHADOW_CARD_SOFT,
          width: 440,
          padding: 28,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600 }}>{variant.title}</div>
        <div style={{ marginTop: 10, fontSize: 14, color: COLORS.ink600, lineHeight: 1.5 }}>
          {variant.body}
        </div>

        <div
          style={{
            marginTop: 16,
            background: COLORS.canvas,
            borderRadius: 12,
            padding: '14px 16px',
            fontFamily: MONO,
            fontSize: 12.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {DATA_ROWS.map((row, i) => (
            <div key={`${row.label}-${i}`} style={{ display: 'flex' }}>
              <span style={{ width: 128, flex: 'none', color: COLORS.ink500 }}>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={() => onResolve(false)}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{
              border: `1px solid ${COLORS.border}`,
              background: cancelHover ? COLORS.canvas : COLORS.white,
              color: COLORS.charcoal,
              borderRadius: 6,
              height: 40,
              padding: '0 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onResolve(true)}
            onMouseEnter={() => setOkHover(true)}
            onMouseLeave={() => setOkHover(false)}
            style={{
              border: 'none',
              background: okHover ? COLORS.electric600 : COLORS.electric500,
              color: COLORS.white,
              borderRadius: 6,
              height: 40,
              padding: '0 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {variant.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
