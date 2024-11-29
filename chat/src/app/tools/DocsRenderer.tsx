import React, {useEffect, useState} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import root from 'react-shadow';

import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {dracula} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import {loadMDFile} from "./md-loader";

export function DocsRenderer({docFile, initOpen}: { docFile: string, initOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initOpen);
  const [docsContent, setDocsContent] = useState('');
  const loadDocs = async () => {
    setDocsContent(await loadMDFile(docFile));
  }
  useEffect(() => {
    const fetchDocs = async () => {
      setDocsContent(await loadMDFile(docFile));
    };
    fetchDocs();
  }, [docFile]);

  return (
    <section className="docs-section">
      <button onClick={async () => {
        // await loadDocs()
        setIsOpen(!isOpen)
      }}>
        {isOpen ? "Hide Documentation" : "Show Documentation"}
      </button>
      {isOpen && (
        <div className="docs-content">
          <root.div>
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code({node, inline, className, children, ...props}: any) {
                  const match = /language-(\w+)/.exec(className || '');

                  return !inline && match ? (
                    <SyntaxHighlighter style={dracula} PreTag="div" language={match[1]} {...props}>
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {docsContent}
            </Markdown>
          </root.div>
        </div>
      )}
    </section>

  );
}