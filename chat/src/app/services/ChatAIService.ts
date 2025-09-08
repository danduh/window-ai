let session: any = null;

export const resetModel = async () => {
  const availability = await LanguageModel.availability();
  return availability;
};

export const getModelCapabilities = async () => {
  return await LanguageModel.params();
};

export const zeroShot = async (
  prompt: string,
  streaming = false,
  systemPrompt?: string,
  destroy = true
): Promise<string | ReadableStream<string>> => {
  if (session && destroy) {
    session.destroy();
    session = null;
  }
  debugger
  if (!session) {
    const createOptions: any = systemPrompt 
      ? { initialPrompts: [{ role: "system", content: systemPrompt }] }
      : {};
    
    session = await LanguageModel.create(createOptions);
  }

  console.log(
    `${session.inputUsage}/${session.inputQuota} tokens used`
  );
  if (!streaming) {
    return await session.prompt(prompt);
  } else {
    return session.promptStreaming(prompt);
  }
};