import {AISummarizerFormat, AISummarizerLength, AISummarizerType} from "chrome-llm-ts";

export const getSummaryAI = async (
  text: string,
  type: AISummarizerType,
  format: AISummarizerFormat,
  length: AISummarizerLength) => {
  const summarizer = await window.Summarizer!.create({type, format, length, text});
  const result = await summarizer.summarize(text);
  summarizer.destroy()
  return result
}
