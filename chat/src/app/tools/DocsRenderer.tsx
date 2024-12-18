import React, {useContext, useEffect, useState} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import root from 'react-shadow';

import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {dracula} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import {loadMDFile} from "./md-loader";
import {AppContext} from "../context";

export function DocsRenderer({docFile, initOpen}: { docFile: string, initOpen?: boolean }) {
  const mainContext = useContext(AppContext);
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

  if (mainContext.inIframe)
    return null;

  return (
    <>
      <section className="docs-section mt-8 border-t border-gray-200 pt-8">
        <button
          className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          onClick={async () => {
            setIsOpen(!isOpen)
          }}>
          {isOpen ? "Hide Documentation" : "Show Documentation"}
        </button>
      </section>
      <section className="docs-section mt-2 border-gray-200">
        {isOpen && (
          <div className="docs-content mt-4 bg-white rounded-lg shadow-md overflow-hidden p-4">
            <root.div>
              <div className="p-4 md:p-6">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          className="rounded-md text-sm"
                          style={dracula} PreTag="div" language={match[1]} {...props}>
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={`${className} bg-gray-100 rounded-md px-1 py-0.5`} {...props}>
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