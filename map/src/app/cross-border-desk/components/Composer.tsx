// Composer — footer: pending-attach pill + attach button + text input (focus
// ring) + Send button. Inputs disabled while busy (D§4).
import { useEffect, useRef, useState } from 'react';
import type { AttachmentRef } from '../types';
import { COLORS, SHADOW_CARD_SOFT } from '../tokens';
import { BillYen } from '../icons';

interface Props {
  pendingAttach: AttachmentRef | null;
  busy: boolean;
  onSend: (text: string) => void;
  onAttachSample: () => void;
  onAttachFile: (file: File) => void;
  onOpenWebcam: () => void;
  onClearAttach: () => void;
}

export function Composer({
  pendingAttach,
  busy,
  onSend,
  onAttachSample,
  onAttachFile,
  onOpenWebcam,
  onClearAttach,
}: Props) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [attachHover, setAttachHover] = useState(false);
  const [sendHover, setSendHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachBtnRef = useRef<HTMLButtonElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  // When the attach menu opens, move focus into it (keyboard access).
  useEffect(() => {
    if (menuOpen) firstItemRef.current?.focus();
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    attachBtnRef.current?.focus();
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    onSend(trimmed);
    setText('');
  };

  const menuItems: { label: string; onSelect: () => void }[] = [
    { label: 'Use demo invoice', onSelect: onAttachSample },
    { label: 'Upload image…', onSelect: () => fileInputRef.current?.click() },
    { label: 'Take a photo', onSelect: onOpenWebcam },
  ];

  return (
    <div style={{ borderTop: `1px solid ${COLORS.divider}`, padding: '14px 32px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Pending-attach pill */}
        {pendingAttach && (
          <div
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: COLORS.purple100,
              borderRadius: 999,
              padding: pendingAttach.kind === 'sample' ? '4px 6px 4px 12px' : '4px 6px 4px 6px',
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.charcoal,
            }}
          >
            {pendingAttach.kind !== 'sample' && (
              <img
                src={pendingAttach.dataUrl}
                alt=""
                style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'cover', display: 'block' }}
              />
            )}
            <span>{pendingAttach.file}</span>
            <button
              type="button"
              onClick={onClearAttach}
              aria-label="Remove attachment"
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: COLORS.pillClose,
                color: COLORS.charcoal,
                fontSize: 12,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Hidden file input for "Upload image…" */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAttachFile(file);
              e.target.value = '';
              setMenuOpen(false);
            }}
          />

          {/* Attach button + menu (demo / upload / webcam) */}
          <div style={{ position: 'relative', flex: 'none' }}>
            <button
              ref={attachBtnRef}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              disabled={busy}
              onMouseEnter={() => setAttachHover(true)}
              onMouseLeave={() => setAttachHover(false)}
              aria-label="Attach an invoice"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: `1px solid ${menuOpen ? COLORS.electric500 : COLORS.border}`,
                background: (attachHover || menuOpen) && !busy ? COLORS.canvas : COLORS.white,
                color: COLORS.charcoal,
                cursor: busy ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BillYen size={20} />
            </button>

            {menuOpen && (
              <>
                {/* click-away layer */}
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                />
                <div
                  role="menu"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') closeMenu();
                  }}
                  style={{
                    position: 'absolute',
                    bottom: 48,
                    left: 0,
                    zIndex: 41,
                    minWidth: 190,
                    background: COLORS.white,
                    border: `1px solid ${COLORS.divider}`,
                    borderRadius: 12,
                    boxShadow: SHADOW_CARD_SOFT,
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {menuItems.map((item, i) => (
                    <button
                      key={item.label}
                      ref={i === 0 ? firstItemRef : undefined}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        item.onSelect();
                      }}
                      style={{
                        textAlign: 'left',
                        border: 'none',
                        background: 'transparent',
                        color: COLORS.charcoal,
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.canvas)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <input
            type="text"
            value={text}
            disabled={busy}
            placeholder="Message Cross-Border Desk…"
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            style={{
              flex: 1,
              height: 44,
              border: `1px solid ${focused ? COLORS.electric500 : COLORS.border}`,
              borderRadius: 8,
              padding: '0 16px',
              fontSize: 15,
              outline: 'none',
              background: COLORS.white,
              color: COLORS.charcoal,
            }}
          />

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            onMouseEnter={() => setSendHover(true)}
            onMouseLeave={() => setSendHover(false)}
            style={{
              height: 44,
              padding: '0 22px',
              border: 'none',
              borderRadius: 6,
              background: sendHover && !busy ? COLORS.electric600 : COLORS.electric500,
              color: COLORS.white,
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? 'default' : 'pointer',
              flex: 'none',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
