import React, { useState } from 'react';
import { Message } from './ChatBox';
import { getSummaryAI } from '../services/SummaryService';
import {
  AISummarizerFormat,
  AISummarizerLength,
  AISummarizerType,
} from 'chrome-llm-ts';
import { DocsRenderer } from '../tools/DocsRenderer';

export function Summary() {
  const [textArea, setTextArea] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [type, setType] = useState<AISummarizerType>(
    AISummarizerType.KeyPoints
  );
  const [format, setFormat] = useState<AISummarizerFormat>(
    AISummarizerFormat.Markdown
  );
  const [length, setLength] = useState<AISummarizerLength>(
    AISummarizerLength.Short
  );

  const handleSummarize = async () => {
    const summary = await getSummaryAI(textArea, type, format, length);
    const newMessage: Message = {
      id: Date.now(),
      text: summary,
      sender: 'Summary AI',
    };
    setMessages([newMessage]);
  };

  const renderOptions = (enumObj: object) =>
    Object.entries(enumObj).map(([key, value]) => (
      <option key={key} value={value}>
        {key}
      </option>
    ));

  return (
    <div className="app max-w-4xl mx-auto p-4">
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Summary</h1>
        <div className="text-input mb-4">
          <textarea
            value={textArea}
            onChange={(e) => setTextArea(e.target.value)}
            className="w-full h-40 p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter text to summarize..."
          ></textarea>
        </div>
        <div className="space-y-4">
          <fieldset className="border border-gray-300 rounded-md p-4">
            <legend className="font-semibold text-lg px-2">Settings</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="type" className="block mb-1">
                  Summary Type:
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as AISummarizerType)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {renderOptions(AISummarizerType)}
                </select>
              </div>
              <div>
                <label htmlFor="length" className="block mb-1">
                  Length:
                </label>
                <select
                  id="length"
                  value={length}
                  onChange={(e) =>
                    setLength(e.target.value as AISummarizerLength)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {renderOptions(AISummarizerLength)}
                </select>
              </div>
              <div>
                <label htmlFor="format" className="block mb-1">
                  Format:
                </label>
                <select
                  id="format"
                  value={format}
                  onChange={(e) =>
                    setFormat(e.target.value as AISummarizerFormat)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {renderOptions(AISummarizerFormat)}
                </select>
              </div>
            </div>
          </fieldset>
          <button
            onClick={handleSummarize}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200"
          >
            Summarize
          </button>
        </div>
      </section>
      <section>
        <div className="output bg-white rounded-lg shadow-md p-4">
          <h3 className="text-xl font-semibold mb-2">Output:</h3>
          <pre className="whitespace-pre-wrap break-words bg-gray-100 p-4 rounded-md">
            {messages[0]?.text || 'Summary will appear here...'}
          </pre>
        </div>
      </section>
      <DocsRenderer docFile="Summary-API.md" />
    </div>
  );
}

export default Summary;
