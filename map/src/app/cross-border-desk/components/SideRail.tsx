// SideRail — 380px aside (layout==="panels"); empty state OR ordered cards
// (InvoiceCard → GistCard → ReplyCard → PayoutCard) (D§5, D§5a).
import type { DeskState } from '../types';
import { COLORS } from '../tokens';
import { InvoiceCard } from './cards/InvoiceCard';
import { GistCard } from './cards/GistCard';
import { ReplyCard } from './cards/ReplyCard';
import { PayoutCard } from './cards/PayoutCard';

interface Props {
  state: DeskState;
  onSelectLang: (showEn: boolean) => void;
  onSelectReply: (ix: number) => void;
}

export function SideRail({ state, onSelectLang, onSelectReply }: Props) {
  const { invoice, detected, translated, summary, replies, payout, settled } = state;
  const hasReply = replies.some((r) => r !== null);
  const railEmpty = !invoice && !summary && !hasReply && !payout;

  return (
    <aside
      style={{
        width: 380,
        flex: 'none',
        overflowY: 'auto',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {railEmpty ? (
        <div
          style={{
            border: `1.5px dashed ${COLORS.border}`,
            borderRadius: 20,
            padding: '28px 22px',
            textAlign: 'center',
            color: COLORS.ink500,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Invoice, gist, reply and payout cards build here as tools run — all on this device.
        </div>
      ) : (
        <>
          {invoice && (
            <InvoiceCard
              invoice={invoice}
              detected={detected}
              translated={translated}
              showEn={state.showEn}
              onSelectLang={onSelectLang}
            />
          )}
          {summary && <GistCard summary={summary} />}
          {hasReply && (
            <ReplyCard replies={replies} replyIx={state.replyIx} onSelectReply={onSelectReply} />
          )}
          {payout && <PayoutCard payout={payout} settled={settled !== null} />}
        </>
      )}
    </aside>
  );
}
