// TypingIndicator — 3 staggered pulsing dots shown while state.busy (D§3f).
import { COLORS } from '../../tokens';

const DELAYS = ['0s', '0.2s', '0.4s'];

export function TypingIndicator() {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '12px 16px',
      }}
    >
      {DELAYS.map((delay) => (
        <span
          key={delay}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: COLORS.ink400,
            animation: 'cbd-pulse 1s infinite',
            animationDelay: delay,
          }}
        />
      ))}
    </div>
  );
}
