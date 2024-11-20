import './WriteRewritePage.scss';
import React, {useState} from "react";
import {Message} from "./ChatBox";
import {
  AIRewriterFormat, AIRewriterLength,
  AIRewriterTone,
  AIWriterFormat,
  AIWriterLength,
  AIWriterTone
} from "chrome-llm-ts";
import {writeAI} from "../services/WriterService";


const renderOptions = (enumObj: object) => {
  return Object.entries(enumObj).map(([key, value]) => (
    <option key={key} value={value}>
      {key}
    </option>
  ));
};

export function WriteRewritePage() {
  const [selectedTone, setSelectedTone] = useState<AIRewriterTone>(
    AIRewriterTone.AsIs
  );
  const [selectedFormat, setSelectedFormat] = useState<AIRewriterFormat>(
    AIRewriterFormat.AsIs
  );
  const [selectedLength, setSelectedLength] = useState<AIRewriterLength>(
    AIRewriterLength.AsIs
  );
  const [textArea, setTextArea] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [useStream, setUseStream] = useState<boolean>(false); // State for "Use Stream" checkbox
  const [tone, setTone] = useState<AIWriterTone>(AIWriterTone.Neutral)
  const [format, setFormat] = useState<AIWriterFormat>(AIWriterFormat.Markdown)
  const [length, setLength] = useState<AIWriterLength>(AIWriterLength.Short);
  const [sharedContext, setSharedContext] = useState<string>('');

  const handleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
    setter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    setter(event.target.value);
  };

  const writeForMe = async () => {

    const response = await writeAI(textArea, useStream, format, length, tone, sharedContext)

    const newMessage: Message = {
      id: Date.now(), // Use current timestamp for unique ID
      text: '',
      sender: 'Writer',
    };

    if (useStream) {
      for await (const text of response as any) {
        setMessages((prevMessages: Message[]) => {
          const lastMessage: Message = prevMessages.pop() || newMessage;
          lastMessage.text = text;
          prevMessages.push(lastMessage)
          return [...prevMessages]
        });
      }
    } else {
      newMessage.text = response as string
      setMessages([newMessage]);
    }
  }

  return (
    <div className="app">
      <h1>Writer</h1>
      <div className="chat-input">
        <textarea
          value={textArea}
          onChange={(e) => setTextArea(e.target.value)}
        ></textarea>
      </div>
      <div className="settings">
        <fieldset>
          <legend>Settings</legend>
          <div>
            <label htmlFor="sharedContext">Shared Context</label>
            <input type="text"
                   id="sharedContext"
                   value={sharedContext}
                   onChange={(e) => setSharedContext(e.target.value)}
            ></input>
          </div>
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

      <section>
        <h1>ReWriter</h1>
        <div className="settings">
          <fieldset>
            <legend>Rewrite Settings</legend>
            <div>
              <label htmlFor="rewriter-tone">Select Tone: </label>
              <select
                id="rewriter-tone"
                value={selectedTone}
                onChange={(e) => handleChange(e, setSelectedTone)}
              >
                {renderOptions(AIRewriterTone)}
              </select>
            </div>
            <div>
              <label htmlFor="rewriter-format">Select Format: </label>
              <select
                id="rewriter-format"
                value={selectedFormat}
                onChange={(e) => handleChange(e, setSelectedFormat)}
              >
                {renderOptions(AIRewriterFormat)}
              </select>
            </div>
            <div>
              <label htmlFor="rewriter-length">Select Length: </label>
              <select
                id="rewriter-length"
                value={selectedLength}
                onChange={(e) => handleChange(e, setSelectedLength)}
              >
                {renderOptions(AIRewriterLength)}
              </select>
            </div>
          </fieldset>
          <button onClick={writeForMe}>Write For Me</button>
        </div>
      </section>
    </div>
  );
}

export default WriteRewritePage;
