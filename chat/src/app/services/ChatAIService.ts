import 'chrome-llm-ts';

let session: any;

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

  if (session && destroy) {
    session.destroy()
    session = null;
  }

  if (!session) {
    session = await window.ai.languageModel.create({systemPrompt})
  }

  if (!streaming) {
    console.log(`${session.tokensSoFar}/${session.maxTokens} (${session.tokensLeft} left)`);
    return await session.prompt(prompt);
  } else {
    return session.promptStreaming(prompt);
  }

}



