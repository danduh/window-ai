import './Summary.css';
import React, {useState} from "react";
import ChatBox, {Message} from "./ChatBox";
import {getSummaryAI} from "../services/SummaryService";
import {AISummarizerFormat, AISummarizerLength, AISummarizerType} from "chrome-llm-ts";

export function RewritePage() {
  const [textArea, setTextArea] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [type, setType] = useState<AISummarizerType>('key-points')
  const [format, setFormat] = useState<AISummarizerFormat>('markdown')
  const [length, setLength] = useState<AISummarizerLength>('short');

  const handleSummarize = async () => {
    console.log(textArea, type, format, length)
    const summary = await getSummaryAI(textArea, type, format, length)
    const newMessage: Message = {
      id: Date.now(), // Use current timestamp for unique ID
      text: summary,
      sender: 'Summary AI',
    };
    setMessages([newMessage])
  }

  return (
    <div className="app">
      <h1>Rewriter</h1>
      <div className="chat-input">
        <textarea
          value={textArea}
          onChange={(e) => setTextArea(e.target.value)}
        ></textarea>
      </div>
      <div>
        <fieldset>
          <legend>Settings</legend>
          <div>
            <label htmlFor="type">Summary Type:</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as AISummarizerType)}>
              <option value="key-points">Key Points</option>
              <option value="tl;dr">TL;DR</option>
              <option value="teaser">Teaser</option>
              <option value="headline">Headline</option>
            </select>
          </div>
          <div>
            <label htmlFor="length">Length:</label>
            <select id="length" value={length} onChange={(e) => setLength(e.target.value as AISummarizerLength)}>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
          <div>
            <label htmlFor="format">Format:</label>
            <select id="format" value={format} onChange={(e) => setFormat(e.target.value as AISummarizerFormat)}>
              <option value="markdown">Markdown</option>
              <option value="plain-text">Plain text</option>
            </select>
          </div>
        </fieldset>
        <button onClick={handleSummarize}>Summarize</button>
      </div>
      <div className="output">
        <pre>{messages[0]?.text}</pre>
      </div>
    </div>
  );
}

export default RewritePage;
