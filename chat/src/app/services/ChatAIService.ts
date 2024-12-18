import 'chrome-llm-ts';
import {AILanguageModel} from "chrome-llm-ts";

let session: null | AILanguageModel;

export const resetModel = async () => {
  const capabilities = await window.ai.languageModel.capabilities();
}

export const getModelCapabilities = async () => {
  return await window.ai.languageModel.capabilities();
}

export const zeroShot = async (prompt: string,
                               streaming = false,
                               systemPrompt?: string,
                               destroy = true) => {

  debugger
  if (session && destroy) {
    session.destroy()
    session = null;
  }

  if (!session) {
    session = await window.ai.languageModel.create({systemPrompt})
  }
  console.log(`${session.tokensSoFar}/${session.maxTokens} (${session.tokensLeft} left)`);
  if (!streaming) {
    return await session.prompt(prompt);
  } else {
    return session.promptStreaming(prompt);
  }

}



