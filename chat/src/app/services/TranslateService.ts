export const translate = async (prompt: string, sourceLanguage = 'en', targetLanguage = 'ru', detectSource = false) => {
  if (detectSource)
    sourceLanguage = await detectLanguage(prompt)


  const languagePair = {
    sourceLanguage, // Or detect the source language with the Language Detection API
    targetLanguage,
  };
  const translator = await window.translation.createTranslator(languagePair);

  const result = await translator.translate(prompt)
  console.log(result)
  return result;
}


export const detectLanguage = async (prompt: string): Promise<string> => {
  const detector = await window.translation.createDetector();

  const results = await detector.detect(prompt);
  console.table(results)
  return results[0].detectedLanguage || "";
}
