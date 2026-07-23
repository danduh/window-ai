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
            <div className="flex items-center justify-end border-b border-gray-200 px-4 py-2.5 dark:border-gray-700 md:px-6">
              <button
                type="button"
                onClick={copyMarkdown}
                disabled={!docsContent}
                title="Copy this page as Markdown"
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:text-blue-400"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copiedMd ? 'Copied!' : 'Copy MD'}
              </button>
            </div>
            <root.div>
              <div className="p-4 md:p-6">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
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