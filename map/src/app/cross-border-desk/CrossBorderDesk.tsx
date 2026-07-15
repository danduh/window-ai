// CrossBorderDesk — ROOT component (D§1). 100vh flex column
// (Header → Main → PresenterRail) + ConfirmDialog overlay. Owns useDesk();
// threads {state, handlers, speed} to children. No business logic here.
import { useState } from 'react';
import { useDesk } from './useDesk';
import { COLORS, FONT_BASE } from './tokens';
import { Header } from './components/Header';
import { ChatTranscript } from './components/ChatTranscript';
import { Composer } from './components/Composer';
import { SideRail } from './components/SideRail';
import { PresenterRail } from './components/PresenterRail';
import { ConfirmDialog } from './components/ConfirmDialog';
import { WebcamCapture } from './components/WebcamCapture';

export function CrossBorderDesk() {
  const { state, handlers } = useDesk();
  const [webcamOpen, setWebcamOpen] = useState(false);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: COLORS.canvas,
        fontFamily: FONT_BASE,
        color: COLORS.charcoal,
      }}
    >
      <Header tier={state.tier} online={state.online} onToggleNet={handlers.toggleNet} />

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* Chat column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <ChatTranscript transcript={state.transcript} busy={state.busy} settled={state.settled} />
          <Composer
            pendingAttach={state.pendingAttach}
            busy={state.busy}
            onSend={handlers.send}
            onAttachDemo={handlers.attachDemo}
            onAttachFile={handlers.attachFile}
            onOpenWebcam={() => setWebcamOpen(true)}
            onClearAttach={handlers.clearAttach}
          />
        </div>

        {/* Side rail */}
        {state.layout === 'panels' && (
          <SideRail
            state={state}
            onSelectLang={handlers.selectLang}
            onSelectReply={handlers.selectReply}
          />
        )}
      </div>

      {state.presenterRail && (
        <PresenterRail state={state} onRunBeat={handlers.runBeat} onReset={handlers.resetAll} />
      )}

      {state.confirm && (
        <ConfirmDialog kind={state.confirm} onResolve={handlers.confirmResolve} />
      )}

      {webcamOpen && (
        <WebcamCapture
          onCapture={(dataUrl) => {
            handlers.attachCapture(dataUrl);
            setWebcamOpen(false);
          }}
          onClose={() => setWebcamOpen(false)}
        />
      )}
    </div>
  );
}

export default CrossBorderDesk;
