import React from 'react';
import { Link } from 'react-router-dom';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import { ApiStatusGrid } from './ApiStatus';
import { useShell } from './AppShell/ShellContext';
import './CheckBrowserPage.css';

// Full demo index — every interactive page in the app.
const DEMOS: { href: string; label: string; desc: string }[] = [
  { href: '/chat', label: 'Chat', desc: 'Conversational Gemini Nano' },
  { href: '/tool-calling', label: 'Tool calling', desc: 'Structured JSON + tools' },
  { href: '/multimodal', label: 'Multimodal', desc: 'Image & webcam input' },
  { href: '/summary', label: 'Summarize', desc: 'Key-points / TL;DR / headline' },
  { href: '/translate', label: 'Translate', desc: 'Translate + detect language' },
  { href: '/live-translate', label: 'Live translate', desc: 'Speech → live translation' },
  { href: '/writer', label: 'Write & Rewrite', desc: 'Draft and transform text' },
  { href: '/proofreader', label: 'Proofread', desc: 'Positioned grammar fixes' },
  { href: '/embeddings', label: 'Embeddings', desc: 'Semantic vectors: cross-lingual search & clustering' },
  { href: '/webmcp', label: 'WebMCP', desc: 'Page as agent tools' },
  { href: '/generative-ui', label: 'Generative UI', desc: 'Tool-driven UI (WebMCP)' },
  { href: '/mcp-client', label: 'MCP Client', desc: 'Chat with a remote MCP server via the built-in LLM' },
];

// Status-color legend shown in the intro card (matches ApiStatus badge colors).
const LEGEND: { dot: string; label: string }[] = [
  { dot: '#22c55e', label: 'Ready — usable now' },
  { dot: '#3b82f6', label: 'Ready · downloads on first use' },
  { dot: '#f59e0b', label: 'Downloading the model' },
  { dot: '#94a3b8', label: 'Unavailable — see “How to enable”' },
];

// On mobile Chrome the built-in AI isn't available yet — point at the docs instead.
const MOBILE_DOCS: { href: string; label: string }[] = [
  { href: '/chat', label: 'Prompt API' },
  { href: '/summary', label: 'Summarizer' },
  { href: '/translate', label: 'Translator' },
  { href: '/multimodal', label: 'Multimodal' },
];

const ArrowRight: React.FC<{ stroke?: string }> = ({ stroke = '#64748b' }) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const CheckBrowserPage: React.FC = () => {
  useSEOData(seoConfigs.checkBrowser, '/status');
  const { present } = useShell();

  return (
    <div className="home-root" style={{ minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2.2em 2em 3em' }}>
        {/* Presentation-mode banner */}
        {present && (
          <div
            className="animate-fade-up"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '1.6em',
              padding: '.7em 1.1em',
              borderRadius: '12px',
              background: 'rgba(59,130,246,.1)',
              border: '1px solid rgba(59,130,246,.3)',
            }}
          >
            <span
              className="font-mono-code"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '.8em',
                fontWeight: 600,
                color: '#93c5fd',
              }}
            >
              <span
                className="animate-pulse-dot"
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '99px',
                  background: '#3b82f6',
                }}
              />
              PRESENTATION MODE
            </span>
            <span
              className="font-mono-code"
              style={{ fontSize: '.75em', color: 'var(--fg3)' }}
            >
              press <b style={{ color: 'var(--fg2)' }}>P</b> or{' '}
              <b style={{ color: 'var(--fg2)' }}>Esc</b> to exit
            </span>
          </div>
        )}

        {/* Hero */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1.1em',
            marginBottom: '1.8em',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: '3.4em',
              height: '3.4em',
              borderRadius: '1em',
              background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 30px -8px rgba(59,130,246,.5)',
            }}
          >
            <svg
              width="1.7em"
              height="1.7em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1
              className="font-display"
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: '2.55em',
                lineHeight: 1.02,
                letterSpacing: '-.025em',
                color: 'var(--fg)',
              }}
            >
              Chrome Built-in AI APIs
            </h1>
            <p style={{ margin: '.35em 0 0', fontSize: '1.05em', color: 'var(--fg3)' }}>
              On-device AI for web apps — live status for your browser
            </p>
          </div>
        </div>

        {/* Intro card */}
        <div
          style={{
            borderRadius: '1em',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '1.5em 1.6em',
            marginBottom: '1.4em',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '1.06em',
              lineHeight: 1.6,
              color: 'var(--fg2)',
            }}
          >
            Chrome ships a set of built-in AI APIs that run{' '}
            <strong style={{ color: 'var(--fg)' }}>on-device</strong> via Gemini Nano — no
            backend, no API keys, no per-request cost, and no data leaving the browser. Some
            are stable, others are in an origin trial or behind a flag. The status on each card
            below is checked{' '}
            <strong style={{ color: 'var(--fg)' }}>live in your current browser</strong>.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '.6em 1.5em',
              marginTop: '1.2em',
            }}
          >
            {LEGEND.map((l) => (
              <div
                key={l.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.6em',
                  fontSize: '.9em',
                  color: 'var(--fg3)',
                }}
              >
                <span
                  style={{
                    width: '.65em',
                    height: '.65em',
                    borderRadius: '99px',
                    background: l.dot,
                  }}
                />
                {l.label}
              </div>
            ))}
          </div>
          {!present && (
            <p style={{ margin: '1.2em 0 0', fontSize: '.84em', color: 'var(--fg3)' }}>
              Requires a desktop Chrome 150+ (Windows, macOS, Linux) that meets the Gemini Nano
              hardware bar (~22&nbsp;GB free disk, &gt;4&nbsp;GB VRAM or 16&nbsp;GB RAM). After
              enabling a flag, relaunch Chrome.
            </p>
          )}
        </div>

        {/* Live API status cards (self-checked availability — do not hardcode) */}
        <ApiStatusGrid />

        {!present && (
          <>
            {/* Try the demos — desktop / tablet */}
            <div
              className="hidden md:block"
              style={{
                marginTop: '2.4em',
                borderRadius: '1em',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                padding: '1.6em',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.7em',
                  marginBottom: '1.2em',
                }}
              >
                <div
                  style={{
                    width: '2.2em',
                    height: '2.2em',
                    borderRadius: '.6em',
                    background: 'linear-gradient(135deg, #22c55e, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="1.1em"
                    height="1.1em"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2
                  className="font-display"
                  style={{ margin: 0, fontWeight: 700, fontSize: '1.5em', color: 'var(--fg)' }}
                >
                  Try the demos
                </h2>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '.7em',
                }}
              >
                {DEMOS.map((d) => (
                  <Link
                    key={d.href}
                    to={d.href}
                    className="home-demo-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '.5em',
                      padding: '.9em 1em',
                      borderRadius: '.7em',
                    }}
                  >
                    <div>
                      <div
                        className="font-display"
                        style={{ fontWeight: 600, fontSize: '.95em', color: 'var(--fg)' }}
                      >
                        {d.label}
                      </div>
                      <div style={{ fontSize: '.8em', color: 'var(--fg3)' }}>{d.desc}</div>
                    </div>
                    <ArrowRight />
                  </Link>
                ))}
              </div>
            </div>

            {/* Footer note — desktop / tablet */}
            <p
              className="hidden md:block"
              style={{
                margin: '1.6em 0 0',
                textAlign: 'center',
                fontSize: '.82em',
                color: 'var(--fg3)',
              }}
            >
              Status verified against the Chrome for Developers docs (July 2026, Chrome 150).
              These APIs are evolving — flags and availability can change between releases.
            </p>

            {/* Mobile — built-in AI isn't on mobile Chrome yet */}
            <div className="md:hidden" style={{ marginTop: '2.4em' }}>
              <div
                style={{
                  borderRadius: '16px',
                  border: '1px solid rgba(59,130,246,.3)',
                  background: 'rgba(59,130,246,.08)',
                  padding: '18px 16px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '11px',
                    background: 'rgba(59,130,246,.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="3" />
                    <path d="M12 18h.01" />
                  </svg>
                </div>
                <div
                  className="font-display"
                  style={{
                    fontWeight: 700,
                    color: 'var(--fg)',
                    fontSize: '17px',
                    lineHeight: 1.25,
                    marginBottom: '6px',
                  }}
                >
                  Built-in AI isn't on mobile Chrome yet
                </div>
                <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--fg3)' }}>
                  Gemini Nano runs on desktop Chrome for now. Stay tuned — mobile support is
                  coming. Meanwhile, you can browse the docs below.
                </div>
              </div>
              <div
                className="font-mono-code"
                style={{
                  fontSize: '10px',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: 'var(--fg3)',
                  margin: '16px 4px 8px',
                }}
              >
                Read the docs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {MOBILE_DOCS.map((m) => (
                  <Link
                    key={m.href}
                    to={m.href}
                    className="home-doc-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 13px',
                      borderRadius: '11px',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg2)' }}>
                      {m.label}
                    </span>
                    <ArrowRight />
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckBrowserPage;
