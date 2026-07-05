// InvoiceCard — vendor halo, detected pill, lang toggle (原文/English),
// line items, total + USD/FX (D§5b).
import type { DetectedLang, InvoiceData, TranslatedDoc } from '../../types';
import { COLORS, SHADOW_CARD_SOFT } from '../../tokens';
import { BillYen } from '../../icons';

interface Props {
  invoice: InvoiceData;
  detected: DetectedLang | null;
  translated: TranslatedDoc | null;
  showEn: boolean;
  onSelectLang: (showEn: boolean) => void;
}

export function InvoiceCard({ invoice, detected, translated, showEn, onSelectLang }: Props) {
  // English content only appears once the doc is translated (prototype: en =
  // s.translated && s.showEn). Before beat 2 the card shows the JA original, so
  // the "translate to English" reveal isn't spoiled.
  const en = translated != null && showEn;
  const vendorName = en ? invoice.vendorEn : invoice.vendor;

  const langPill = (label: string, active: boolean, target: boolean) => (
    <button
      type="button"
      onClick={() => onSelectLang(target)}
      style={{
        border: `1px solid ${active ? COLORS.charcoal : COLORS.border}`,
        background: active ? COLORS.charcoal : COLORS.white,
        color: active ? COLORS.white : COLORS.ink600,
        borderRadius: 999,
        padding: '4px 13px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        background: COLORS.white,
        borderRadius: 20,
        boxShadow: SHADOW_CARD_SOFT,
        padding: 20,
      }}
    >
      {/* Header: halo + vendor + detected pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: COLORS.purple200,
            color: COLORS.charcoal,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
          }}
        >
          <BillYen size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{vendorName}</div>
          <div style={{ fontSize: 12, color: COLORS.ink500 }}>
            {invoice.number} · due {invoice.due}
          </div>
        </div>
        {detected && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: COLORS.midnight100,
              color: COLORS.midnight800,
              borderRadius: 999,
              padding: '4px 12px',
              flex: 'none',
            }}
          >
            {detected.code.toUpperCase()} · {detected.confidence}
          </span>
        )}
      </div>

      {/* Lang toggle (only when translated exists) */}
      {translated && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {langPill('原文', !showEn, false)}
          {langPill('English', showEn, true)}
        </div>
      )}

      {/* Line items */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {invoice.items.map((item) => (
          <div
            key={item.ja}
            style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, gap: 12 }}
          >
            <span style={{ color: COLORS.ink600 }}>{en ? item.en : item.ja}</span>
            <span style={{ fontWeight: 500, flex: 'none' }}>{item.amt}</span>
          </div>
        ))}
      </div>

      {/* Total row */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${COLORS.divider}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{en ? 'Total' : '合計'}</span>
          <span style={{ fontSize: 20, fontWeight: 600 }}>{invoice.totalDisplay}</span>
        </div>
        <div style={{ fontSize: 12, color: COLORS.ink500, marginTop: 4, textAlign: 'right' }}>
          {invoice.usd} · {invoice.fx}
        </div>
      </div>
    </div>
  );
}
