import {TranslationLanguageOptions} from "chrome-llm-ts";

export const translate = async (prompt: string,
                                sourceLanguage = 'en',
                                targetLanguage = 'ru') => {
  const languagePair = {
    sourceLanguage, // Or detect the source language with the Language Detection API
    targetLanguage,
  };
  const translator = await window.Translator.create(languagePair);
  return  await translator.translate(prompt)
}

export const detectLanguage = async (prompt: string): Promise<string> => {
  const languagePair = {
    sourceLanguage:'en',
    targetLanguage:'ru',
  };
  const detector = await window.Translator.create(languagePair);

  const results = await detector.detect(prompt);
  return results[0].detectedLanguage || "";
}


export const canTranslate = async (languagePair: TranslationLanguageOptions) => {
  return await window.Translator.canTranslate(languagePair);
}