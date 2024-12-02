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
  const [useStream, setUseStream] = useState<boolean>(false);
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
    <div className="app">
      <section>
        <h1>AI Language Detection and Translation</h1>
        <div className="text-input">
          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
          />
        </div>
        <div className="settings">
          <fieldset>
            <legend>Settings</legend>
            <div>
              <label>Use Stream</label>
              <input
                type="checkbox"
                checked={useStream}
                onChange={e => setUseStream(e.target.checked)}
              />
            </div>
            <div>
              <label htmlFor="sourceLanguage">Source Language</label>
              <select
                ref={selectRef}
                id="sourceLanguage"
                value={sourceLanguage}
                onChange={e => {
                  setSourceLanguage(e.target.value)
                }}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="targetLanguage">Target Language</label>
              <select
                id="targetLanguage"
                value={targetLanguage}
                onChange={e => setTargetLanguage(e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>
                <button onClick={detectSourceLng}>Detect Language</button>
              </label>
              <span>{sourceLanguage}</span>
            </div>
            <div>
              <label>
                <button onClick={isCanTranslate}>Check if Available</button>
              </label>
              <span>{translationAbility}</span>
            </div>
          </fieldset>
          <button onClick={handleTranslate}>Translate</button>
        </div>
        <div className="output">
          <h3>Translation:</h3>
          <pre>{translation}</pre>
        </div>
      </section>
      <DocsRenderer docFile="Translate-API.md"></DocsRenderer>
    </div>
  );
};

export default TranslatePage;
