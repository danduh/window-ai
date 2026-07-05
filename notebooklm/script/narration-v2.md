# Narration Script v2 — "Small LLM in your Browser"
**Runtime: ~30 minutes** · Language level: **B2** (simple, clear English) · Tone: playful but credible
Generated from the v2 plan (Payoneer-branded deck). `[DEMO]` = switch to live browser; `[SLIDE]` = slide change. Speaker identity fields are placeholders.

---

## Opening hook

### [SLIDE] 1 — Title  ·  ~0:00 → 0:35

Hello everyone, and thank you for being here. I have one small request before we start. Please do not look at my slides right now. Instead, look at my browser. In a moment I will open the developer tools and show you the network tab. That is the panel that lists every request a web page sends to a server. Keep your eyes on it. If nothing appears there, something interesting is happening. Let us find out together.

### [DEMO] D1 — [DEMO] Live translate  ·  ~0:35 → 1:20

> **DEMO:** Open windowai.danduh.me/live-translate. Open Chrome DevTools, select the Network tab, and clear it so it is visibly empty. Click the microphone button and speak one short friendly sentence, for example 'Good morning, I hope you are enjoying the conference.' Wait for four translations to appear on screen: Spanish, French, German, Japanese. Then point the audience back to the Network tab, still empty.

So here is the page. This is my microphone button. I will say one sentence out loud. Good morning, I hope you are enjoying the conference. Now watch the screen. There it is in Spanish. In French. In German. And in Japanese. Four languages, in about a second. Now look here at the network tab. It is empty. Zero requests. Nothing was sent to a server. No cloud. No API. My words never left this laptop.

### [SLIDE] 2 — What just happened  ·  ~1:20 → 1:57

So what just happened? On a supported desktop, Chrome downloads a small on-device model — Gemini Nano, about four gigabytes — in the background, so on many machines it is already there. Your web page calls it with a small piece of JavaScript. No backend, no API key, no cost per request. It is not on every device — it needs capable hardware, and the user can switch it off — so later I will show you how to check for it and fall back cleanly. This did not exist eighteen months ago. Now it ships in the browser. For the next thirty minutes, I want to show you what this unlocks for the applications you build.

## Section 2 — The shift

### [SLIDE] 2b — The old way — every AI feature was a cloud call  ·  ~1:57 → 2:19

For years, every AI feature worked the same way. It was a cloud call. The browser talked to your server. Your server talked to a provider. Then the answer came all the way back. This costs money. It also takes time. And it sends user data away from the user.

### [SLIDE] 3 — Four forces (2024–2026)  ·  ~2:19 → 2:45

So why can we now do this in the browser? Four things changed. Let me show them to you, one by one. First, small models got good. Second, the hardware got fast enough. Third, browsers made a shared bet. And fourth, the cloud AI bill came due. Together, these four forces flipped the whole picture.

### [SLIDE] 4 — Force 1 — Small models got good  ·  ~2:45 → 3:13

Force one. Small models got good. A model like Gemini Nano, Phi, Llama, or Qwen is now small. Two to four billion parameters. And it is instruction-tuned, so it follows what you ask. The key word here is good enough. These small models now clear the bar for the tasks people really use every day. Summarize a long text. Translate it. Rewrite it. Sort it into categories. Pull out the important parts. They are not GPT-4. And for these jobs, they do not need to be.

### [SLIDE] 5 — Force 2 — Hardware got fast enough  ·  ~3:13 → 3:41

Force two. The hardware got fast enough. This is the quiet part. Apple Silicon has been in Macs since 2020. On Windows, the NPU, a chip made for AI work, is now normal. And integrated GPUs from 2023 and later are strong too. So here is the point. The laptop that people already own can run a small model at conversation speed. You do not need a data center. The machine on the desk is enough.

### [SLIDE] 6 — Force 3 — Browsers aligned  ·  ~3:41 → 4:15

Force three. The browsers aligned. This matters, because as web developers we build on the browser. Chrome leads here: the core APIs have been stable since version 138, and as of July 2026 the current stable Chrome is version 150 — so this is shipping software, not an experiment. Other Chromium browsers, like Edge, are picking up the same APIs, and Firefox has signaled interest. Let me be honest: we are not at multi-vendor stability yet — today this is really a Chrome story. But the direction is clear, and everyone is pointing the same way.

### [SLIDE] 7 — Force 4 — The bill came due  ·  ~4:15 → 4:45

Force four. The bill came due. This is my favorite one. Think back to 2023. Every team said the same thing. Let us add AI to our product. It felt free and exciting. Then 2025 arrived. And now every one of those teams has a spreadsheet. A spreadsheet with the cost for each user, every month. For a big, special feature, maybe that cost is fine. But for a basic feature, paying fifty cents per user per month does not work. Multiply that by a million users, and someone in finance starts asking hard questions.

### [SLIDE] 8 — The cost flipped  ·  ~4:45 → 5:25

So put all four forces together, and the cost flips. Cloud on the left, on-device on the right. Per request, the cloud costs a fraction of a cent up to ten cents; on-device, there is no per-call cost — it is zero. And a cloud call spends two hundred to two thousand milliseconds on the network round trip; on-device there is no round trip at all — the model runs right here, so the network wait is gone. Local inference still takes a moment, but you are not paying the network tax. Does data leave the device? In the cloud, always; on-device, never. Offline? Cloud, no; on-device, yes. Here is the important idea: when the cost becomes truly free, your old habits become wrong. You stop counting calls. You can run the model on every keystroke. The whole design space changed.

## API tour: LanguageModel + task APIs

### [SLIDE] 9 — The whole surface, one page  ·  ~5:25 → 6:20

Let me show you the whole thing on one slide. This is the complete developer surface. You get seven JavaScript globals, plus one extra layer for tools called WebMCP. That is all of it. And here is the good news. Every single one follows the same four steps. First you check availability. Then you create a session. Then you do the work. Then you destroy the session to free memory. Availability, create, work, destroy. If you learn these four steps once, you already understand every API on this list. So the surface looks big, but the mental model is small.

### [SLIDE] 10 — LanguageModel — the chat API  ·  ~6:20 → 7:05

Let's start with LanguageModel. This is the general chat API. It talks to Gemini Nano, the small model that lives inside your browser. Good news for July 2026: this one is now stable on the web since Chrome 148. That means normal web pages can use it, not only extensions. When should you use it? Use it when the task-specific APIs do not fit your case. It handles a full conversation, system prompts, structured JSON output, and even images. So this is your flexible tool. The other APIs, which we will see soon, are more focused.

### [DEMO] 11 — A minimal session  ·  ~7:05 → 8:15

> **DEMO:** Open /chat. Show a short streaming conversation. Keep the pirate persona as a light running gag.

Here is the smallest example that does something real. Three moves. First, we create a session. Inside, we pass an initial prompt with the system role. This sets the personality. Here we tell the model to be a concise pirate. Second, we call prompt with our question. Third, we get text back. And the pirate answers: the capital be Paris. Now two tips for real products. Tip one: stream by default. For anything longer than one sentence, use promptStreaming, so the user sees words appear right away instead of waiting. Tip two: keep your conversation in one session. The session remembers the earlier turns, so the model has context. That is it. Create, prompt, done. The pirate stays with us for the rest of the talk.

### [SLIDE] 12 — Structured output  ·  ~8:15 → 9:23

This next slide is the part that makes it shippable. You give the model a JSON schema. Here the schema says: return an object with one field, sentiment, and it must be positive, negative, or neutral. Then you pass that schema as responseConstraint. Now here is the magic. While the model generates, the runtime blocks any token that would break the schema. So you get valid JSON every time. No parsing errors. No retry loops. No cleaning up messy text. This is how you build reliable features like classification and data extraction on top of a small model. One small note for today: the official W3C name is responseConstraint, but the current Chrome build still uses the name responseFormat. Same idea, two names. Check that in your version.

### [SLIDE] 13 — The task APIs  ·  ~9:23 → 10:21

Now the task APIs. There are four: Summarizer, Writer, Rewriter, and Proofreader. They all run on the same Gemini Nano model. But each one is tuned for its job with special settings you do not see. Because of that tuning, the output is more reliable than if you wrote your own prompt by hand. So if your task fits one of these four, prefer it. You will write less code and get better results. Now let me be honest about status, because it matters in July 2026. Summarizer is stable. But Writer, Rewriter, and Proofreader are still behind a flag or in an origin trial. So they are great for demos and experiments, but not yet ready to ship to every user.

### [DEMO] 14 — Summarizer  ·  ~10:21 → 11:06

> **DEMO:** Open /summary. Paste a long article. Show the four summary types.

Let's look at Summarizer, the stable one. You create it with a few options. Type key-points, format markdown, length medium. But the option I really want you to notice is sharedContext. This tells the model what kind of text it is reading. Here we say: this is a customer support email. That one line changes everything. The same model will summarize a support email, a medical article, or a team chat in the right way for each. So same model, but the output fits your product. Let me show it live.

### [SLIDE] 15 — Writer vs Rewriter  ·  ~11:06 → 11:50

Next, Writer and Rewriter. The names look almost the same, so people mix them up. But they do different jobs. Writer creates new text from a short brief. You give it an idea, it gives you a first draft. Rewriter takes text you already have and changes it. You can change the tone, make it shorter, or make it more formal. Both let you control tone, length, and format. So a simple rule: no text yet, use Writer. Text already exists, use Rewriter. They are separate APIs because the tuning behind them is different.

### [SLIDE] 15b — Writer & Rewriter — in code  ·  ~11:50 → 12:16

Here are those two APIs in real code — and yes, you can paste this straight into the console. Writer takes a short brief and returns a first draft. Rewriter takes text you already have and reshapes it — here, more formal. Notice both calls pass an output language, English, so Chrome does not warn and the output stays clean. One honest note: Writer and Rewriter are still behind a flag today, so keep a canned fallback ready for the live demo.

### [DEMO] 16 — Proofreader — positioned fixes  ·  ~12:16 → 13:03

> **DEMO:** Open /proofreader. Type a sentence with mistakes. Show inline tooltips.

Last one, Proofreader. You give it a sentence with mistakes. She dont know nothing. It gives you back the corrected sentence: she doesn't know anything. But it gives you more than just clean text. It also returns a list of corrections. Each correction has a start position, an end position, the suggested fix, and a category. Why does that matter? Because with positions, you can highlight each mistake right where it is in the text. You can show a small tooltip on hover. That is exactly what you need to build inline, Grammarly-style suggestions inside your own app. Let me show it live.

## API tour: Translation + Multimodal

### [SLIDE] 17 — Translator + LanguageDetector  ·  ~13:03 → 13:53

Let me start with the two oldest and most stable APIs. The first one is the Language Detector. You give it some text, and it tells you which language it is. The second one is the Translator. You give it a source language and a target language, and it translates. Both of these have been stable since Chrome 138. That means you can use them today, in normal web pages. The first time you use a language, the browser downloads a small language pack. After that, it stays on the device. And remember the demo I opened this talk with? That was these two APIs, plus the browser Speech API, working together.

### [SLIDE] 18 — Composing them  ·  ~13:53 → 14:43

Here is the code that ran in the opening. The browser listens to my voice and turns it into text. Then, for each target language, I call a translator. I run them all in parallel with Promise dot all, and I show the results. Each translator keeps its own small language pack in memory. So after the first translation, the rest are basically instant. And here is one good tip. Create the translators when the page loads, not when the user clicks. Then the packs are already downloaded, and the very first click feels fast.

### [DEMO] 19 — Multimodal — one option  ·  ~14:43 → 16:18

> **DEMO:** Open /multimodal. Drop a photo, ask 'What is in this picture?'. Then switch to the webcam tab to show continuous frame analysis. Optional 30s hook: show a photo of a fridge and ask what you can cook tonight — this teases the finale.

Now the fun part. The Prompt API can also see images. You turn it on with one option, called expected inputs. You just say: I will send text and images. After that, your prompt is not a single string anymore. It is an array of parts. You mix text parts and image parts together. Let me show you. I open the multimodal page, I drop in a photo, and I ask: what is in this picture? Now let me switch to the webcam tab, where it looks at a live video. Three tips for webcam. First, shrink each frame before you send it, to save time. Second, keep only one request running at a time. Third, reuse one session, do not create a new one for every frame. And here is a simple example to remember: I could take a photo of my fridge and ask what I can cook tonight. Same API, just an image instead of a document.

## Section 5 — WebMCP: The Page as Tools

### [SLIDE] 20 — WebMCP — the page as tools  ·  ~16:18 → 17:10

Now the last API, and for me the most exciting one. A web page can describe its own actions as tools. Think of a button like "scale this recipe" or "add to cart." The page can expose that action as a tool that an AI agent can call. The agent can live inside the page, or inside the browser. It is a public origin trial today, starting in Chrome 149. And here is my most honest sentence of the whole talk. The entry point was just renamed. It moved from navigator dot modelContext to document dot modelContext in Chrome 150. So please do not ship this to production yet. It is still moving under our feet.

### [SLIDE] 21 — registerTool  ·  ~17:10 → 17:54

The code is small. One method, one descriptor. You give the tool a name, a short description so the agent knows when to use it, and an input schema. Then you write the execute function. This function runs inside your page. It has your page data and the current user session. So the page is the trust boundary. The agent asks, but your code decides what actually happens. Notice the first line. We read document dot modelContext first, and fall back to the old name. That keeps the demo working across Chrome versions while the API settles down.

### [SLIDE] 21b — Session inheritance  ·  ~17:54 → 18:40

Here is the clever part. The agent does not log in on its own. It is a guest in your tab. You are already signed in on the site. So when the agent calls a tool, like buy this ticket or book this room, it just works with your session. There is no separate API key. There is no second login for the robot. In one simple line: the agent borrows your cookies while you are already logged in. This is a big deal, because it means the site does not have to build a whole new machine-to-machine login just to let an agent help the user.

### [SLIDE] 21c — Already happening  ·  ~18:40 → 19:28

And this is not only a demo on my laptop. Large sites are already testing it — you can see names here that you use every week. Now compare two ways an agent can drive a website. The old way: the agent looks at a screenshot, guesses where to click, and repeats. The new way: the agent calls a real tool with clear inputs. In Google's reported tests, the tool way wins on both counts — much higher task accuracy, around ninety-eight percent, and far fewer tokens, around eighty-nine percent fewer. Why so many fewer tokens? Because there are no images to send to the model. Text tools are simply cheaper than pictures of a screen.

### [DEMO] 21d — Google demo suite  ·  ~19:28 → 20:18

> **DEMO:** Play a 15-second montage of Google's WebMCP demos (maze, CineFlow, hotel booking). Then open /webmcp on windowai.danduh.me and type a prompt asking the agent to scale the cake recipe to 12 servings; show the scaleRecipe tool firing and the recipe updating live.

Google also shipped a set of demos to show this off. There is a maze that you escape by prompting an agent instead of using the arrow keys. It may be the only game where bad typing is the hard mode. There is a movie ticket flow called CineFlow. There is a hotel booking app, and a small smart home. Now let me bring this back home. Watch our own recipe page. I will simply ask the agent to scale the cake to twelve servings. I do not touch the form. The agent calls our scaleRecipe tool, our code runs, and the recipe updates. Same idea as the big sites, just small enough to fit on one screen.

## Architecture patterns

### [SLIDE] 22 — Four patterns to remember  ·  ~20:18 → 20:58

Let me give you four patterns. If you remember only these four, you can ship real features with these APIs. Number one: always check availability before you create a session. The model may not be ready yet. Number two: create one session per feature, and reuse it. Do not make a new session on every click. Number three: for anything that reacts to typing, keep only one request running at a time. Number four: degrade gracefully. If the API is missing, show a normal fallback. Never block the page. Let me show you two of these in code.

### [SLIDE] 23 — Show download progress  ·  ~20:58 → 21:48

The first time a user runs your feature, the model may need to download. It can be large. So never freeze the page. First you check availability. Then, when you create the session, you pass a monitor callback. The browser sends download progress events. Here we simply read how much is loaded and update a progress bar. The user sees something moving, not a frozen screen. This is a small piece of code, but it is the difference between a demo that feels broken and one that feels finished.

### [SLIDE] 24 — Abort on new input  ·  ~21:48 → 22:43

Now the typing case. Imagine the user types, and every keystroke starts a request. Without care, the answer for keystroke five can arrive after keystroke twelve. The user sees the wrong result. So the rule is simple: before you start a new request, cancel the old one. Here we keep one controller. When new input comes, we abort the one in flight, make a fresh AbortController, and pass its signal into prompt streaming. One small note. For network APIs, we often slowed requests down on purpose, to save money. But this model is free and runs on the device. So that old habit is now more of a problem than a good idea. Just cancel and start again.

## Section 7 — Grand finale + opportunity + close

### [SLIDE] F1 — One app, every API  ·  ~22:43 → 23:18

So far, I showed you each API on its own. One box, one job. That is nice, but it is not the real story. The real story starts when you put them in one app, and they start to help each other. So let me show you that now. One app. Almost every built-in API we talked about today. All working together, at the same time, on your device.

### [DEMO] F2 — [FINALE DEMO]  ·  ~23:18 → 24:53

> **DEMO:** SLOT-NEUTRAL finale. Option A 'Sidekick' (Chrome extension side panel, works on any site): summarize a page, translate a selection, proofread an input, rewrite text, explain an image, warn before pasting private data, drive a WebMCP page. Option B 'The Fridge' (web app): fridge photo → recipes → translate a foreign recipe → summarize the steps → voice agent scales/swaps ingredients via WebMCP. Run one option live; keep the 10–15s pre-recorded backup clip ready and play it if live inference stalls.

Watch what happens. First, I open a page full of text, and I ask for a short summary. The model reads it and gives me the key points in a few seconds. Nothing leaves my machine. Next, part of this page is in another language, so I select it and translate it, right here, offline. Now I type a reply. As I type, the tool proofreads my text and offers a cleaner version if I want it. Then I drop in an image, and I ask, what is this? The model looks at the picture and explains it. And here is my favorite part. Before I paste something that looks private, like an email or a card number, the tool warns me. Finally, the app talks to the page itself through WebMCP, and drives the tools on that page for me. So think about what just happened. I did not build a big AI product. I built one small tool. And suddenly, every website feels smart.

### [SLIDE] F3 — Finale punchline  ·  ~24:53 → 25:28

This is the point I want you to keep. The value is not any single feature on that list. The value is that the browser itself can now make an ordinary page feel intelligent. It reads, it translates, it explains, it protects you. For free. And in private, on your device. You did not add AI to one product. You made the whole browser a little bit smarter.

### [SLIDE] 25 — What this unlocks  ·  ~25:28 → 25:48

So that is the how. Now let me switch to the what. What can you actually build with this? Let me hold here for one second, because this next part is the reason I gave this talk.

### [SLIDE] 26 — Seven categories  ·  ~25:48 → 26:58

Here are seven kinds of products. Eighteen months ago, all of them were too expensive for most teams. Today they are cheap. One. Real-time text, like live translation in a chat. Two. Privacy-first AI, where the data never leaves the device. Three. Offline AI, that still works on a plane or a train. Four. Ambient editor help, like proofreading that just happens while you type. Five. Multimodal, where the user points at an image and says, show me what this is. Six. The agentic web, still early, where an agent uses the tools on your page for the user. And seven, the big one. Everything that used to be too expensive to even try. Now you can just try it.

### [SLIDE] 27 — What stays in the cloud  ·  ~26:58 → 27:58

Now let me be honest with you, because this matters. On-device does not replace the cloud. The model in your browser is small. That is the whole point, but it is also the limit. Long documents that need deep reasoning? Cloud. Complex code and hard math? Cloud. Questions that need broad, up-to-date facts? Cloud. Shared state between many users? That is a server job. So the right design is not local or cloud. It is hybrid. Use the small local model for the fast, private, always-on layer. Send the heavy work to the cloud. Each one does what it is good at.

### [SLIDE] 28 — The first thing to ship  ·  ~27:58 → 28:53

So if your team wants to add just one on-device feature this quarter, how do you pick? Use these four points. One. The user already wishes this thing was automatic. Two. There is a clear privacy reason to keep the data local. Three. It does not need a long document as context. And four. You have a clean fallback for browsers that do not support it yet. If a feature fits all four, ship that one first. Good examples? Live translation. Inline proofreading. Smart paste. Summarize on save. Or private-data detection, like we saw in the demo.

### [SLIDE] 29 — Closing line  ·  ~28:53 → 29:51

Let me slow down for the close. Not long ago, the idea 'what if we just ran a language model right here' needed a big budget and a long plan. Servers, bills, meetings. Now it needs one create call. That is the shift. The browser quietly became a place to run AI. Nobody announced it. But it is here. The teams that notice this in 2026 will ship the next web apps. And one more calm thought. Your next important user may not be a person. It may be an AI agent that helps them. WebMCP is how your page says hello to that agent. Just remember: WebMCP is still changing quickly, so do not ship it to production yet.

### [DEMO] 30 — Resources  ·  ~29:51 → 30:21

> **DEMO:** Stay on this slide for Q&A.

Thank you so much for your time. Everything I showed you today is live, running in the browser, and you can try it yourself. The demos are at windowai.danduh.me. The full source code is on GitHub. The Chrome team docs and the WebMCP spec are on these links too. I will stay on this slide, and I would love to take your questions.

---

**Total: 30:21 across 39 slides.**
