import './Summary.css';
import React, {useState} from "react";
import ChatBox, {Message} from "./ChatBox";
import {getSummaryAI} from "../services/SummaryService";
import {
  AISummarizerFormat,
  AISummarizerLength,
  AISummarizerType,
  AIWriterFormat,
  AIWriterLength,
  AIWriterTone
} from "chrome-llm-ts";
import {reWriteAI, writeAI} from "../services/WriterService";

export function WriteRewrite() {
  const [textArea, setTextArea] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [useStream, setUseStream] = useState<boolean>(false); // State for "Use Stream" checkbox
  const [tone, setTone] = useState<AIWriterTone>(AIWriterTone.Neutral)
  const [format, setFormat] = useState<AIWriterFormat>(AIWriterFormat.Markdown)
  const [length, setLength] = useState<AIWriterLength>(AIWriterLength.Short);
  const [sharedContext, setSharedContext] = useState<string>();

  const writeForMe = async () => {

    const summary = await reWriteAI(textArea, useStream, format, length, tone, sharedContext)
    debugger
    const newMessage: Message = {
      id: Date.now(), // Use current timestamp for unique ID
      text: summary as string,
      sender: 'Writer',
    };
    setMessages([newMessage])
  }

  return (
    <div className="app">
      <h1>Writer / Rewriter</h1>
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
            <label htmlFor="type">Tone:</label>
            <select id="type" value={tone} onChange={(e) => setTone(e.target.value as AIWriterTone)}>
              <option value={AIWriterTone.Neutral}>{AIWriterTone.Neutral}</option>
              <option value={AIWriterTone.Casual}>{AIWriterTone.Casual}</option>
              <option value={AIWriterTone.Formal}>{AIWriterTone.Formal}</option>
            </select>
          </div>
          <div>
            <label htmlFor="length">Length:</label>
            <select id="length" value={length} onChange={(e) => setLength(e.target.value as AIWriterLength)}>
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
          <div>
            <label htmlFor="format">Format:</label>
            <select id="format" value={format} onChange={(e) => setFormat(e.target.value as AIWriterFormat)}>
              <option value="markdown">Markdown</option>
              <option value="plain-text">Plain text</option>
            </select>
          </div>
        </fieldset>
        <button onClick={writeForMe}>Write For Me</button>
      </div>
      <div className="output">
        <pre>{messages[0]?.text}</pre>
      </div>
    </div>
  );
}

export default WriteRewrite;
