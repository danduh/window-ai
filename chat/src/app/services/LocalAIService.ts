import 'chrome-llm-ts';

export interface ChatResponse {
  id: string;
  response: string;
}

let session: any;

export const zeroShot = async (prompt: string, streaming = false, systemPrompt?: string) => {
  if (!session)
    session = await window.ai.languageModel.create({systemPrompt})

  if (!streaming) {
    return await session.prompt(prompt);
  } else {
    return session.promptStreaming(prompt);
  }
}



