import {AISummarizerFormat, AISummarizerLength, AISummarizerType} from "chrome-llm-ts";

export const getSummaryAI = async (
  text: string,
  type: AISummarizerType,
  format: AISummarizerFormat,
  length: AISummarizerLength) => {

  const summarizer = await window.ai.summarizer!.create({type, format, length});

  const result = await summarizer.summarize(text);
  summarizer.destroy()
  console.log(result);
  return result
}
