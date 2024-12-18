import 'chrome-llm-ts';
import {
  AIRewriterFormat,
  AIRewriterLength,
  AIRewriterTone,
  AIWriterFormat,
  AIWriterLength,
  AIWriterTone
} from "chrome-llm-ts";


export const writeAI = async (prompt: string,
                              stream = false,
                              format?: AIWriterFormat,
                              length?: AIWriterLength,
                              tone?: AIWriterTone,
                              sharedContext?: string) => {

  const writer = await window.ai.writer!.create({sharedContext});
  if (stream) {
    return writer.writeStreaming(prompt);
  } else {
    return await writer.write(prompt);
  }
}


export const reWriteAI = async (prompt: string,
                                stream = false,
                                format?: AIRewriterFormat,
                                length?: AIRewriterLength,
                                tone?: AIRewriterTone,
                                sharedContext?: string) => {

  const reWriter = await window.ai.rewriter!.create({sharedContext, format, length, tone});
  if (stream) {
    return reWriter.rewriteStreaming(prompt);
  } else {
    return await reWriter.rewrite(prompt);
  }
}


