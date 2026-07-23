import React, {useContext, useEffect, useState} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import root from 'react-shadow';

import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {dracula} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import {loadMDFile} from "./md-loader";
import {AppContext} from "../context";

/**
 * A syntax-highlighted code block with a copy-to-clipboard button so readers can
 * paste snippets straight into the DevTools console. Inline styles are used
 * intentionally — this renders inside a react-shadow shadow root where the page's
 * Tailwind classes do not apply. navigator.clipboard works from the shadow root
 * because the click provides the required user activation (secure-context only).
 */
function CodeBlock({language, value}: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context / permissions) — fail quietly.
    }
  };

  return (
    <div style={{position: 'relative'}}>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1,
          border: 'none',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'pointer',
          color: '#fff',
          background: copied ? '#16a34a' : 'rgba(255,255,255,0.14)',
          backdropFilter: 'blur(2px)',
          transition: 'background 150ms',
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <SyntaxHighlighter
        className="rounded-md text-sm"
        style={dracula}
        PreTag="div"
        language={language}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export function DocsRenderer({docFile, initOpen}: { docFile: string, initOpen?: boolean }) {
  const mainContext = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(initOpen || false);
  const [docsContent, setDocsContent] = useState('');
  const [copiedMd, setCopiedMd] = useState(false);

  // Copy the entire doc page as its original Markdown source. docsContent is the
  // raw .md (loaded via raw-loader), so this is verbatim markdown, not rendered.
  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(docsContent);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 1500);
    } catch {
      // Clipboard blocked (insecure context / permissions) — fail quietly.
    }
  };

  useEffect(() => {
    const fetchDocs = async () => {
      setDocsContent(await loadMDFile(docFile));
    };
    fetchDocs();
  }, [docFile]);

  if (mainContext.inIframe)
    return null;

  // The doc's title is its first Markdown H1. We decorate exactly that heading
  // with the Copy-MD action, matched by its text — a call-order latch would
  // misfire under React's dev double-render (StrictMode).
  const titleText = (docsContent.match(/^#[ \t]+(.+)$/m)?.[1] || '').trim();

  return (
    <>
      {!initOpen && (
        <section className="docs-section mt-8 pt-8">
          <button
            className="w-full md:w-auto px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
            onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? "Hide Documentation" : "Show Documentation"}
          </button>
        </section>
      )}
      
      <section className="docs-section mt-2 ">
        {(isOpen || initOpen) && (
          <div className="docs-content mt-4 bg-white dark:bg-gray-800 rounded-lg overflow-hidden transition-colors duration-200">
            <root.div>
              <div className="p-4 md:p-6">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    // Put "Copy MD" on the same line as the doc's title (first h1).
                    h1({ children }: any) {
                      const text = (Array.isArray(children) ? children : [children])
                        .map((c) => (typeof c === 'string' ? c : ''))
                        .join('')
                        .trim();
                      if (!titleText || text !== titleText) return <h1>{children}</h1>;
                      return (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            flexWrap: 'wrap',
                            marginBottom: '.4em',
                          }}
                        >
                          <h1 style={{ margin: 0 }}>{children}</h1>
                          <button
                            type="button"
                            onClick={copyMarkdown}
                            title="Copy this page as Markdown"
                            style={{
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontFamily: 'inherit',
                              fontSize: '12px',
                              fontWeight: 600,
                              lineHeight: 1,
                              padding: '7px 11px',
                              borderRadius: '7px',
                              cursor: 'pointer',
                              background: 'transparent',
                              border: `1px solid ${copiedMd ? '#16a34a' : 'rgba(148,163,184,.5)'}`,
                              color: copiedMd ? '#16a34a' : '#3b82f6',
                              transition: 'all 150ms',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            {copiedMd ? 'Copied!' : 'Copy MD'}
                          </button>
                        </div>
                      );
                    },
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <CodeBlock
                          language={match[1]}
                          value={String(children).replace(/\n$/, '')}
                        />
                      ) : (
                        <code className={`${className} bg-gray-100 dark:bg-gray-800 rounded-md px-1 py-0.5 text-gray-900 dark:text-gray-100`} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {docsContent}
                </Markdown>
              </div>
            </root.div>
          </div>
        )}
      </section>
    </>
  );
}