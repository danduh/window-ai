import {pipeline} from "@xenova/transformers";


export const talkToMe = async (textToRead: string) => {
  const synthesizer = await pipeline(
    "text-to-speech",
    "Xenova/speecht5_tts", {
      quantized: false,
    }
  );

  const speaker_embeddings =
    "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin";

  const out = await synthesizer(
    textToRead,
    {
      speaker_embeddings,
    }
  );

  // Create an AudioContext to play the audio
  const audioContext = new AudioContext();
  const audioBuffer = audioContext.createBuffer(
    1,
    out.audio.length,
    out.sampling_rate
  );

  // Copy the audio data to the buffer
  audioBuffer.getChannelData(0).set(out.audio);

  // Create a buffer source and connect it to the audio context
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = 1.5;
  source.connect(audioContext.destination);

  // Play the audio
  source.start(0);
}