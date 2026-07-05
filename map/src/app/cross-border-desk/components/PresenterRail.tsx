// PresenterRail — dark footer: "Demo script" label, 5 beat buttons
// (number/✓ circle), spacer, Reset (D§6).
import { useState } from 'react';
import type { Beat, DeskState } from '../types';
import { BEATS } from '../brain';
import { COLORS } from '../tokens';

interface Props {
  state: DeskState;
  onRunBeat: (beat: Beat) => void;
  onReset: () => void;
}

function beatDone(beat: Beat, state: DeskState): boolean {
  switch (beat.n) {
    case 1:
      return state.invoice !== null;
    case 2:
      return state.summary !== null;
    case 3:
      return state.replies[3] !== null;
    case 4:
      return state.payout !== null;
    case 5:
      return state.settled !== null;
    default:
      return false;
  }
}

export function PresenterRail({ state, onRunBeat, onReset }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [resetHover, setResetHover] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 24px',
        background: COLORS.charcoal,
        overflowX: 'auto',
        flex: 'none',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: COLORS.onDark55,
          flex: 'none',
        }}
      >
        Demo script
      </span>

      {BEATS.map((beat) => {
        const done = beatDone(beat, state);
        return (
          <button
            key={beat.n}
            type="button"
            onClick={() => onRunBeat(beat)}
            onMouseEnter={() => setHovered(beat.n)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: `1px solid ${COLORS.ink600}`,
              background: hovered === beat.n ? COLORS.charcoalHover : 'transparent',
              color: COLORS.white,
              borderRadius: 999,
              padding: '6px 14px 6px 6px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flex: 'none',
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                background: done ? COLORS.purple500 : COLORS.charcoalHover,
                color: done ? COLORS.charcoal : COLORS.white,
                flex: 'none',
              }}
            >
              {done ? '✓' : beat.n}
            </span>
            {beat.label}
          </button>
        );
      })}

      <span style={{ flex: 1 }} />

      <button
        type="button"
        onClick={onReset}
        onMouseEnter={() => setResetHover(true)}
        onMouseLeave={() => setResetHover(false)}
        style={{
          border: `1px solid ${COLORS.ink600}`,
          background: 'transparent',
          color: resetHover ? COLORS.white : COLORS.onDark70,
          borderRadius: 999,
          padding: '6px 16px',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          flex: 'none',
        }}
      >
        Reset
      </button>
    </div>
  );
}
