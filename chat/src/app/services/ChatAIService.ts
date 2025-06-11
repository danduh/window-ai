import 'chrome-llm-ts';
import { AILanguageModel } from 'chrome-llm-ts';

let session: null | AILanguageModel;

export const resetModel = async () => {
  // const capabilities = await window.ai.languageModel.capabilities();
  const capabilities = await window.LanguageModel.availability();
};

export const getModelCapabilities = async () => {
  return await window.LanguageModel.availability();
  // return await window.ai.languageModel.capabilities();
};
type NeverType = never;

export const zeroShot = async (
  prompt: string,
  streaming = false,
  systemPrompt?: string,
  destroy = true
) => {
  if (session && destroy) {
    session.destroy();
    session = null;
  }

  if (!session) {
    
    session = (await window.LanguageModel.create({
      systemPrompt,
    })) as NeverType;
  }

  console.log(
    `${session.tokensSoFar}/${session.maxTokens} (${session.tokensLeft} left)`
  );
  if (!streaming) {
    return await session.prompt(prompt);
  } else {
    return session.promptStreaming(prompt);
  }
};
