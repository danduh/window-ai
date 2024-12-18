import React, {useRef, useState} from 'react';
import {canTranslate, detectLanguage, translate} from '../services/TranslateService';
import {DocsRenderer} from "../tools/DocsRenderer";
import {TranslationAvailability} from "chrome-llm-ts";

const languages = [
  {code: 'en', name: 'English'},
  {code: 'uk', name: 'Ukrainian'},
  {code: 'es', name: 'Spanish'},
  {code: 'ja', name: 'Japanese'},
  {code: 'fr', name: 'French'},
  {code: 'de', name: 'German'},
  {code: 'ru', name: 'Russian'},
  // Add more languages as needed
];


const TranslatePage: React.FC = () => {
  const [sourceText, setSourceText] = useState<string>('');
  const [translation, setTranslation] = useState<string>();
  const [sourceLanguage, setSourceLanguage] = useState<string>('uk');
  const [targetLanguage, setTargetLanguage] = useState<string>('ja');
  const [translationAbility, setTranslationAbility] = useState<TranslationAvailability>();
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleOutput = async (response: string | AsyncIterable<string>) => {
    if (typeof response === 'string') {
      setTranslation(response);
    } else {
      for await (const text of response) setTranslation(text);
    }
  };

  const handleTranslate = async () => {
    const response = await translate(sourceText, sourceLanguage, targetLanguage);
    if (response) {
      await handleOutput(response);
    }
  };

  const detectSourceLng = async () => {
    const detectedLng = await detectLanguage(sourceText)
    setSourceLanguage(detectedLng)
  }

  const isCanTranslate = async () => {
    const res = await canTranslate({sourceLanguage, targetLanguage})
    setTranslationAbility(res)
  }

  return (
    <div className="app max-w-4xl mx-auto p-4">
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-6 text-center">AI Language Detection and Translation</h1>
        <div className="text-input mb-4">
          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            className="w-full h-40 p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter text to translate..."
          />
        </div>
        <div className="settings space-y-4">
          <fieldset className="border border-gray-300 rounded-md p-4">
            <legend className="font-semibold text-lg px-2">Settings</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <button
                  onClick={detectSourceLng}
                  className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300 transition duration-200"
                >
                  Detect Language
                </button>
                <span className="ml-2 font-semibold">{sourceLanguage}</span>
              </div>
              <div>
                <label htmlFor="sourceLanguage" className="block mb-1">Source Language</label>
                <select
                  ref={selectRef}
                  id="sourceLanguage"
                  value={sourceLanguage}
                  onChange={e => setSourceLanguage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="targetLanguage" className="block mb-1">Target Language</label>
                <select
                  id="targetLanguage"
                  value={targetLanguage}
                  onChange={e => setTargetLanguage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={isCanTranslate}
                  className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300 transition duration-200"
                >
                  Check if Available
                </button>
                <span className="ml-2 font-semibold">{translationAbility}</span>
              </div>
            </div>
          </fieldset>
          <button
            onClick={handleTranslate}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200"
          >
            Translate
          </button>
        </div>
      </section>
      <section>
        <div className="output bg-white rounded-lg shadow-md p-4">
          <h3 className="text-xl font-semibold mb-2">Translation:</h3>
          <pre className="whitespace-pre-wrap break-words bg-gray-100 p-4 rounded-md min-h-[100px]">
            {translation || "Translation will appear here..."}
          </pre>
        </div>
      </section>
      <DocsRenderer docFile="Translate-API.md"/>
    </div>
  );
};

export default TranslatePage;
