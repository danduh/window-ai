import 'chrome-llm-ts';

export interface ChatResponse {
  id: string;
  response: string;
}

let session: any;

export const zeroShot = async (prompt: string, streaming = false, systemPrompt?: string) => {
  if (!session)
    session = await window.ai.languageModel.create(
      {
        // systemPrompt,
        // initialPrompts: [
        //     {
        //         role: "system",
        //         content: "Predict up to 5 emojis as a response to a comment. Output emojis, comma-separated."
        //     },
        //     {role: "user", content: "This is amazing!"},
        //     {role: "assistant", content: "4,5"},
        //     {role: "user", content: "LGTM"},
        //     {role: "assistant", content: "6,7"}
        // ]
      })

  if (!streaming) {
    return await session.prompt(prompt);
  } else {
    return session.promptStreaming(prompt);
  }
}
export const rewrite = async (prompt: string) => {
  const detector = await window.ai.rewrite.create();

  const results = await detector.detect(prompt);
  for (const result of results) {
    debugger
    console.log(result.detectedLanguage, result.confidence);

  }
  return 'ddd'
}
export const translate = async (prompt: string) => {
  const languagePair = {
    sourceLanguage: 'en', // Or detect the source language with the Language Detection API
    targetLanguage: 'ru',
  };
  const translator = await window.translation.createTranslator(languagePair);
  debugger
  const result = await translator.translate(prompt)
  console.log(result)
  return 'ddd'
}



