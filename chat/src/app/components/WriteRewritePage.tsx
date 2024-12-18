import React, {useEffect, useState} from "react";
import {
  AIRewriterFormat, AIRewriterLength, AIRewriterTone,
  AIWriterFormat, AIWriterLength, AIWriterTone
} from "chrome-llm-ts";
import {reWriteAI, writeAI} from "../services/WriterService";

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

  return (
    <div className="app max-w-4xl mx-auto p-4">
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Writer</h1>
        <div className="text-input mb-4">
          <textarea
            value={textArea}
            onChange={e => setTextArea(e.target.value)}
            className="w-full h-40 p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter text to write or rewrite..."
          />
        </div>
        <div className="settings space-y-4">
          <fieldset className="border border-gray-300 rounded-md p-4">
            <legend className="font-semibold text-lg px-2">Settings</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <label className="mr-2">Use Stream</label>
                <input
                  type="checkbox"
                  checked={useStream}
                  onChange={(e) => setUseStream(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
              </div>
              <div className="col-span-full">
                <label htmlFor="sharedContext" className="block mb-1">Shared Context</label>
                <input
                  id="sharedContext"
                  value={sharedContext}
                  onChange={e => setSharedContext(e.target.value)}
                  className="w-full h-10 p-2 border border-gray-300 rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter shared context for writing and rewriting..."
                />
              </div>
              <div>
                <label htmlFor="tone" className="block mb-1">Tone:</label>
                <select
                  id="tone"
                  value={tone}
                  onChange={e => handleSelectChange(e, setTone)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {renderOptions(AIWriterTone)}
                </select>
              </div>
              <div>
                <label htmlFor="length" className="block mb-1">Length:</label>
                <select
                  id="length"
                  value={length}
                  onChange={e => handleSelectChange(e, setLength)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {renderOptions(AIWriterLength)}
                </select>
              </div>
              <div>
                <label htmlFor="format" className="block mb-1">Format:</label>
                <select
                  id="format"
                  value={format}
                  onChange={e => handleSelectChange(e, setFormat)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {renderOptions(AIWriterFormat)}
                </select>
              </div>
            </div>
          </fieldset>
          <button
            onClick={writeForMe}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200"
          >
            Write For Me
          </button>
        </div>
      </section>
      <section>
        <div className="output bg-white rounded-lg shadow-md p-4">
          <h3 className="text-xl font-semibold mb-2">Output:</h3>
          <pre className="whitespace-pre-wrap break-words bg-gray-100 p-4 rounded-md min-h-[100px]">
          {output || "Output will appear here..."}
        </pre>
        </div>
      </section>
      {output && (
        <section className="mb-8">
          <h1 className="text-3xl font-bold mb-6 text-center">Re Writer</h1>
          <div className="settings space-y-4">
            <fieldset className="border border-gray-300 rounded-md p-4">
              <legend className="font-semibold text-lg px-2">Rewrite Settings</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <label className="mr-2">Use Stream</label>
                  <input
                    type="checkbox"
                    checked={useStream}
                    onChange={(e) => setUseStream(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="rewriter-tone" className="block mb-1">Select Tone: </label>
                  <select
                    id="rewriter-tone"
                    value={selectedTone}
                    onChange={e => handleSelectChange(e, setSelectedTone)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {renderOptions(AIRewriterTone)}
                  </select>
                </div>
                <div>
                  <label htmlFor="rewriter-format" className="block mb-1">Select Format: </label>
                  <select
                    id="rewriter-format"
                    value={selectedFormat}
                    onChange={e => handleSelectChange(e, setSelectedFormat)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {renderOptions(AIRewriterFormat)}
                  </select>
                </div>
                <div>
                  <label htmlFor="rewriter-length" className="block mb-1">Select Length: </label>
                  <select
                    id="rewriter-length"
                    value={selectedLength}
                    onChange={e => handleSelectChange(e, setSelectedLength)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {renderOptions(AIRewriterLength)}
                  </select>
                </div>
              </div>
            </fieldset>
            <button
              onClick={reWrite}
              className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition duration-200"
            >
              Rewrite
            </button>
          </div>
        </section>
      )}
      <DocsRenderer docFile="Writer-ReWriter-API.md"/>
    </div>
  );
}

export default WriteRewritePage;
