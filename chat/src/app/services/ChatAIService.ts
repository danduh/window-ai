import 'chrome-llm-ts';

let session: any;

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
    return await session.prompt(prompt);
  } else {
    return session.promptStreaming(prompt);
  }

}



