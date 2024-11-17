import 'chrome-llm-ts';
import {AI, AIWriterFormat, AIWriterLength, AIWriterTone} from "chrome-llm-ts";


export const writeAI = async (prompt: string,
                              stream = false,
                              format?: AIWriterFormat,
                              length?: AIWriterLength,
                              tone?: AIWriterTone,
                              sharedContext?: string) => {
  debugger
  const writer = await window.ai.writer!.create({sharedContext, format, length, tone});
  debugger
  if (stream) {
    return writer.writeStreaming(prompt);
  } else {
    return await writer.write(prompt);
  }
}
export const reWriteAI = async (prompt: string,
                                stream = false,
                                format?: AIWriterFormat,
                                length?: AIWriterLength,
                                tone?: AIWriterTone,
                                sharedContext?: string) => {
  debugger
  const reWriter = await window.ai.rewriter!.create();
  debugger
  if (stream) {
    return reWriter.rewriteStreaming(prompt);
  } else {
    return await reWriter.rewrite(prompt);
  }
}


