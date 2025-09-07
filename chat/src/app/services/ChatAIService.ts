import 'chrome-llm-ts';
import { AILanguageModel, AILanguageModelFactory } from 'chrome-llm-ts';

declare global {
  const LanguageModel: AILanguageModelFactory;
}

let session: null | AILanguageModel;

export const resetModel = async () => {
  // const capabilities = await window.ai.languageModel.capabilities();
  await LanguageModel.availability();
};

export const getModelCapabilities = async () => {
  return await LanguageModel.availability();
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
    const createOptions = systemPrompt 
      ? { initialPrompts: [{ role: "system" as const, content: systemPrompt }] }
      : {};
    
    session = (await LanguageModel.create(createOptions)) as NeverType;
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
