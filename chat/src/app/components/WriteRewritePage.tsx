import React, {useEffect, useState} from "react";
import {
  AIRewriterFormat, AIRewriterLength, AIRewriterTone,
  AIWriterFormat, AIWriterLength, AIWriterTone
} from "chrome-llm-ts";
import {reWriteAI, writeAI} from "../services/WriterService";

// import docsContent from '../docs/Writer-ReWriter-API.md'
import {DocsRenderer} from "../tools/DocsRenderer";
import {loadMDFile} from "../tools/md-loader";
import {talkToMe} from "../services/TexToSpeachService";

const renderOptions = (enumObj: object) => (
  Object.entries(enumObj).map(([key, value]) => (
    <option key={key} value={value}>{key}</option>
  ))
);

export function WriteRewritePage() {
  const [textArea, setTextArea] = useState('');
  const [output, setOutput] = useState<string>('');
  const [useStream, setUseStream] = useState(false);
  const [tone, setTone] = useState<AIWriterTone>(AIWriterTone.Neutral);
  const [format, setFormat] = useState<AIWriterFormat>(AIWriterFormat.Markdown);
  const [length, setLength] = useState<AIWriterLength>(AIWriterLength.Short);
  const [sharedContext, setSharedContext] = useState('');
  const [selectedTone, setSelectedTone] = useState<AIRewriterTone>(AIRewriterTone.AsIs);
  const [selectedFormat, setSelectedFormat] = useState<AIRewriterFormat>(AIRewriterFormat.AsIs);
  const [selectedLength, setSelectedLength] = useState<AIRewriterLength>(AIRewriterLength.AsIs);

  const handleSelectChange = <T, >(event: React.ChangeEvent<HTMLSelectElement>, setter: React.Dispatch<React.SetStateAction<T>>) => {
    setter(event.target.value as T);
  };

  const handleOutput = async (response: string | any) => {
    if (useStream) {
      for await (const text of response) setOutput(text);
    } else {
      setOutput(response as string);
    }
  }

  const writeForMe = async () => {
    const response = await writeAI(textArea, useStream, format, length, tone, sharedContext);
    await handleOutput(response)
  };

  const reWrite = async () => {
    const response = await reWriteAI(output.trim(), useStream, selectedFormat, selectedLength, selectedTone, sharedContext);
    await handleOutput(response)
  };

  // const readForMe = async () => {
  //   await talkToMe(output);
  // }


  return (
    <div className="app">
      <section>
        <h1>Writer</h1>
        <div className="text-input">
          <textarea value={textArea} onChange={e => setTextArea(e.target.value)}/>
        </div>
        <div className="settings">
          <fieldset>
            <legend>Settings</legend>
            <div>
              <label>Use Stream</label>
              <input
                type="checkbox"
                checked={useStream}
                onChange={(e) => setUseStream(e.target.checked)}
              />
            </div>
            <div>
              <label htmlFor="sharedContext">Shared Context</label>
              <input id="sharedContext" value={sharedContext} onChange={e => setSharedContext(e.target.value)}/>
            </div>
            <div>
              <label htmlFor="tone">Tone:</label>
              <select id="tone" value={tone} onChange={e => handleSelectChange(e, setTone)}>
                {renderOptions(AIWriterTone)}
              </select>
            </div>
            <div>
              <label htmlFor="length">Length:</label>
              <select id="length" value={length} onChange={e => handleSelectChange(e, setLength)}>
                {renderOptions(AIWriterLength)}
              </select>
            </div>
            <div>
              <label htmlFor="format">Format:</label>
              <select id="format" value={format} onChange={e => handleSelectChange(e, setFormat)}>
                {renderOptions(AIWriterFormat)}
              </select>
            </div>
          </fieldset>
          <button onClick={writeForMe}>Write For Me</button>
          {/*<button onClick={readForMe}>Read For Me</button>*/}
        </div>
      </section>
      <div className="output">
        <h3>Output:</h3>
        <pre>{output}</pre>
      </div>
      {output && (
        <section>
          <h1>Re Writer</h1>
          <div className="settings">
            <fieldset>
              <legend>Rewrite Settings</legend>
              <div>
                <label>Use Stream</label>
                <input
                  type="checkbox"
                  checked={useStream}
                  onChange={(e) => setUseStream(e.target.checked)}
                />
              </div>
              <div>
                <label htmlFor="rewriter-tone">Select Tone: </label>
                <select id="rewriter-tone" value={selectedTone} onChange={e => handleSelectChange(e, setSelectedTone)}>
                  {renderOptions(AIRewriterTone)}
                </select>
              </div>
              <div>
                <label htmlFor="rewriter-format">Select Format: </label>
                <select id="rewriter-format" value={selectedFormat}
                        onChange={e => handleSelectChange(e, setSelectedFormat)}>
                  {renderOptions(AIRewriterFormat)}
                </select>
              </div>
              <div>
                <label htmlFor="rewriter-length">Select Length: </label>
                <select id="rewriter-length" value={selectedLength}
                        onChange={e => handleSelectChange(e, setSelectedLength)}>
                  {renderOptions(AIRewriterLength)}
                </select>
              </div>
            </fieldset>
            <button onClick={reWrite}>Rewrite</button>
          </div>
        </section>
      )}
      <DocsRenderer docFile="Writer-ReWriter-API.md"></DocsRenderer>
    </div>
  );
}

export default WriteRewritePage;
