// AssistantMessage — m.k==="a": left-aligned grey bubble (D§3b).
import type { Msg } from '../../types';
import { COLORS } from '../../tokens';

export function AssistantMessage({ m }: { m: Msg }) {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        maxWidth: '78%',
        background: COLORS.canvas,
        borderRadius: '14px 14px 14px 4px',
        padding: '11px 16px',
        fontSize: 15,
        lineHeight: 1.5,
      }}
    >
      {m.text}
    </div>
  );
}
