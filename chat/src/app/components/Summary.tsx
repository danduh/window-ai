import React, {useState} from "react";
import {Message} from "./ChatBox";
import {getSummaryAI} from "../services/SummaryService";
import {
  AISummarizerFormat,
  AISummarizerLength,
  AISummarizerType
} from "chrome-llm-ts";
import {DocsRenderer} from "../tools/DocsRenderer";

export function Summary() {
  const [textArea, setTextArea] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [type, setType] = useState<AISummarizerType>(AISummarizerType.KeyPoints);
  const [format, setFormat] = useState<AISummarizerFormat>(AISummarizerFormat.Markdown);
  const [length, setLength] = useState<AISummarizerLength>(AISummarizerLength.Short);

  const handleSummarize = async () => {
    const summary = await getSummaryAI(textArea, type, format, length);
    const newMessage: Message = {
      id: Date.now(),
      text: summary,
      sender: 'Summary AI',
    };
    setMessages([newMessage]);
  };

  const renderOptions = (enumObj: object) => (
    Object.entries(enumObj).map(([key, value]) => (
      <option key={key} value={value}>{key}</option>
    ))
  );

  return (
    <div className="app">
      <section>
        <h1>Summary</h1>
        <div className="text-input">
        <textarea
          value={textArea}
          onChange={e => setTextArea(e.target.value)}
        ></textarea>
        </div>
        <div>
          <fieldset>
            <legend>Settings</legend>
            <div>
              <label htmlFor="type">Summary Type:</label>
              <select id="type" value={type} onChange={e => setType(e.target.value as AISummarizerType)}>
                {renderOptions(AISummarizerType)}
              </select>
            </div>
            <div>
              <label htmlFor="length">Length:</label>
              <select id="length" value={length} onChange={e => setLength(e.target.value as AISummarizerLength)}>
                {renderOptions(AISummarizerLength)}
              </select>
            </div>
            <div>
              <label htmlFor="format">Format:</label>
              <select id="format" value={format} onChange={e => setFormat(e.target.value as AISummarizerFormat)}>
                {renderOptions(AISummarizerFormat)}
              </select>
            </div>
          </fieldset>
          <button onClick={handleSummarize}>Summarize</button>
        </div>
      </section>
      <section>
        <div className="output">
          <h3>Output:</h3>
          <pre>{messages[0]?.text}</pre>
        </div>
      </section>
      <DocsRenderer docFile="Summary-API.md"></DocsRenderer>
    </div>
  );
}

export default Summary;
