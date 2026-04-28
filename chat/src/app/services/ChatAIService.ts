let session: any = null;

export const resetModel = async () => {
  const availability = await LanguageModel.availability();
  return availability;
};

export const getModelCapabilities = async () => {
  // Chrome 146 Canary runtime no longer exposes `LanguageModel.params()` even
  // though the d.ts (chat/src/app/types/dom-chromium-ai.d.ts) declares it as
  // a static method. Feature-detect at runtime so the /chat page mounts
  // cleanly when the runtime API has drifted; surface availability so the
  // banner / Model Stats panel can render "N/A" gracefully.
  type LMParams = {
    readonly defaultTopK: number;
    readonly maxTopK: number;
    readonly defaultTemperature: number;
    readonly maxTemperature: number;
  };
  type LMAvailability = "unavailable" | "downloadable" | "downloading" | "available";
  const LM = LanguageModel as unknown as {
    params?: () => Promise<LMParams>;
    availability: () => Promise<LMAvailability>;
  };
  let availability: LMAvailability = "unavailable";
  try {
    availability = await LM.availability();
  } catch {
    // Older Canary builds without availability() — fall through.
  }
  if (typeof LM.params === "function") {
    try {
      const p = await LM.params();
      return { ...p, available: availability === "available" };
    } catch {
      // Param query failed — return availability only.
    }
  }
  return { available: availability === "available" };
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
      ? { outputLanguage: 'en', initialPrompts: [{ role: "system", content: systemPrompt }] }
      : { outputLanguage: 'en' };

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
