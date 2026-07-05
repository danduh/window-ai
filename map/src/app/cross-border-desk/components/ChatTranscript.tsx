// ChatTranscript — scroller + inner 680px column; maps state.transcript to
// message renderers; auto-scroll to bottom; typing indicator when busy (D§3).
import { useEffect, useRef } from 'react';
import type { Msg, SettleResult } from '../types';
import { UserMessage } from './messages/UserMessage';
import { AssistantMessage } from './messages/AssistantMessage';
import { StatusPill } from './messages/StatusPill';
import { ToolChipMessage } from './messages/ToolChipMessage';
import { PrivacyCard } from './messages/PrivacyCard';
import { TypingIndicator } from './messages/TypingIndicator';

interface Props {
  transcript: Msg[];
  busy: boolean;
  settled: SettleResult | null;
}

function renderMsg(m: Msg, settled: SettleResult | null) {
  switch (m.k) {
    case 'u':
      return <UserMessage key={m.id} m={m} />;
    case 'a':
      return <AssistantMessage key={m.id} m={m} />;
    case 's':
      return <StatusPill key={m.id} m={m} />;
    case 't':
      return <ToolChipMessage key={m.id} m={m} />;
    case 'p':
      // Privacy card reads the settled minimal payload; render only if present.
      return settled ? <PrivacyCard key={m.id} payload={settled.payload} /> : null;
    default:
      return null;
  }
}

export function ChatTranscript({ transcript, busy, settled }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [transcript, busy]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {transcript.map((m) => renderMsg(m, settled))}
        {busy && <TypingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  );
}
