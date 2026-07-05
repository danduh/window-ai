# Multimodal — Images and Webcam Frames in the Prompt

## The one-line summary

Pass `expectedInputs: [{ type: 'image' }, { type: 'text' }]` to `LanguageModel.create()`, and your prompts become arrays of content parts. You can mix `{ type: 'text', value: '...' }` and `{ type: 'image', value: <imageLike> }` parts in any order. Audio input works the same way — declare `{ type: 'audio' }` and pass an audio `Blob`/`AudioBuffer`. Everything runs on-device — no images or audio leave the browser.

## Availability

- **Stable since Chrome 148** on the open web (desktop, capable GPU). The whole Prompt API — including multimodal image/audio input via `expectedInputs` and structured output — is now stable on the open web; it is **no longer extensions-only**. No flag needed. Current stable at time of writing is **Chrome 150**.
- **Pre-148 Canary** used `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` — no longer needed on stable.
- **Not available** on iOS, Android, ChromeOS.

Check before assuming:

```js
const status = await LanguageModel.availability({
  expectedInputs: [{ type: 'image' }],
});
if (status === 'unavailable') {
  // hardware doesn't meet bar — render fallback UI
}
```

## Creating a multimodal session

```js
const session = await LanguageModel.create({
  expectedInputs: [
    { type: 'text', languages: ['en'] },
    { type: 'image' },
  ],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
});
```

The session is otherwise identical to a text-only session — same `prompt()`, `promptStreaming()`, `destroy()`. The `expectedInputs` option tells the runtime to load the vision tower, which is why you need to declare it up-front.

## Image input types

Any of these are valid `value` for an `{ type: 'image', value: X }` part:

- `Blob` (from a file input, drag-drop, or `fetch()`)
- `ImageBitmap`
- `HTMLImageElement` (an `<img>` element)
- `HTMLVideoElement` (a `<video>` element — gets the current frame)
- `HTMLCanvasElement` or `OffscreenCanvas`
- `ImageData`

```js
// File input
const fileInput = document.querySelector('input[type=file]');
const blob = fileInput.files[0];

const answer = await session.prompt([
  { type: 'text', value: 'What is in this picture?' },
  { type: 'image', value: blob },
]);
```

## The common use case shapes

### Single image Q&A (paste, drop, upload)

```js
async function describe(imageBlob) {
  const reply = await session.prompt([
    { type: 'text', value: 'Describe this image in one sentence.' },
    { type: 'image', value: imageBlob },
  ]);
  return reply;
}
```

Wire up to drop, paste, or file input — the same function works for all three. Browsers normalize the input to a `Blob` you can hand to the API.

### "What's in my fridge?" (photo → structured inventory)

A photo of the inside of a fridge is a great multimodal demo — the model reads the shelves and, combined with structured output, hands back a clean list you can act on. Ask for JSON via `responseConstraint` (the W3C option name; Chrome currently ships this as `responseFormat`), pass it a JSON Schema, and the reply is machine-readable:

```js
const schema = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'string' } },
  },
  required: ['items'],
};

const reply = await session.prompt(
  [
    { type: 'text', value: 'List the food items you can see in this fridge.' },
    { type: 'image', value: fridgePhotoBlob },
  ],
  { responseConstraint: schema }, // Chrome build: responseFormat
);
const { items } = JSON.parse(reply); // -> { items: ["milk", "eggs", "spinach", ...] }
```

This is the seed of the "Fridge" finale app: fridge photo → recipe ideas → translate a foreign recipe → summarize the steps → a voice agent scales/swaps ingredients via WebMCP. The multimodal call here is step one; the rest chains the other built-in APIs on top of the inventory it produces.

### Single-frame webcam capture

```js
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
videoEl.srcObject = stream;

async function captureAndAsk(question) {
  const canvas = new OffscreenCanvas(videoEl.videoWidth, videoEl.videoHeight);
  canvas.getContext('2d').drawImage(videoEl, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });

  return session.prompt([
    { type: 'text', value: question },
    { type: 'image', value: blob },
  ]);
}
```

### Continuous webcam analysis (live mode)

This is the tricky case. You want to analyze the webcam feed at sustained throughput — every ~3 seconds — without backing up.

**Three rules:**

1. **Downsample frames.** A 1920×1080 webcam frame is wasteful — the vision tower downsamples to 384–768 px internally anyway. Pre-downsample to 640px on the long side before sending. Saves ~80% of the per-call cost.
2. **Single in-flight only.** Use a `Promise<unknown> | null` flag. Skip frames if the previous prompt hasn't resolved.
3. **Reuse the session.** Create the `LanguageModel` once, outside the loop. Recreating per frame burns ~300 ms warm-up each time and leaks memory.

```js
const session = await LanguageModel.create({
  expectedInputs: [{ type: 'image' }],
});

let inFlight = null;

setInterval(async () => {
  if (inFlight) return; // skip — previous still running

  const canvas = new OffscreenCanvas(640, 360);
  canvas.getContext('2d').drawImage(videoEl, 0, 0, 640, 360);
  const blob = await canvas.convertToBlob({ type: 'image/png' });

  inFlight = session.prompt([
    { type: 'text', value: 'What objects are visible?' },
    { type: 'image', value: blob },
  ]);

  try {
    const result = await inFlight;
    appendToTranscript(result);
  } finally {
    inFlight = null;
  }
}, 100); // poll every 100ms, but skip when busy
```

On consumer hardware (M2 Mac, mid-range Windows GPU), this sustains ~3 sec per frame analysis. On high-end hardware, ~1 sec.

## What the model can do with images

Strong:

- **Object identification** ("there's a coffee cup and a laptop")
- **Scene description** ("an office with bright natural light")
- **Text extraction from images** (OCR-like — works for clear printed text, struggles with handwriting)
- **Counting small numbers of things** ("3 people in the photo")
- **Color and composition** ("predominantly blue, low contrast")
- **Reading slide / document images** at moderate quality

Weak:

- **Reading dense or stylized text** (small fonts, handwriting, ornate fonts) — falls back to guessing
- **Fine spatial relationships** ("is the cat on top of the box or behind it?") — unreliable
- **Counting many things** (>10) — accuracy drops sharply
- **Faces** — model is intentionally limited here; do not use for identity tasks
- **Medical / scientific images** — not trained for this; output is plausible but unreliable

## Multi-image prompts

You can include multiple images in one prompt:

```js
await session.prompt([
  { type: 'text', value: 'How are these two photos similar?' },
  { type: 'image', value: blob1 },
  { type: 'image', value: blob2 },
]);
```

Practical limit is ~4 images per prompt before quality degrades and latency spikes. For more than that, do them in serial calls.

## Performance numbers (rough, May 2026, consumer hardware)

| Setup | Latency to first token | Tokens/sec |
|---|---|---|
| Single image (640×360), short prompt | 800–1500 ms | 20–40 |
| Single image (1920×1080), short prompt | 1500–3000 ms | 20–40 |
| 4 images, short prompt | 2500–5000 ms | 15–30 |

For UI: render a "thinking" indicator immediately, stream the response.

## Privacy story

This is the **headline** for the multimodal demo. Webcam frames are processed entirely in the browser's GPU memory. They are not sent to any server, not logged, not cached on disk. When the page closes, the frames are gone.

Compare to cloud vision APIs:

- Cloud: webcam → upload → vendor server → log? → response back
- On-device: webcam → GPU → response → garbage collected

For HIPAA, GDPR, or any consumer-facing "we'd never send your camera anywhere" promise, this is the right architecture.

## When NOT to use multimodal

- When the image task is precise (exact bounding boxes, exact pixel coordinates). Nano is a generalist; use a specialized model.
- When you need *recognition* of specific people, products, or logos. Nano is generic; you want a fine-tuned model.
- When latency matters more than privacy and the user is online. A cloud vision API is faster per call.

For everything else — *"tell me roughly what's in this image"* — multimodal Nano is the right call.
