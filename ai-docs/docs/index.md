## Enabling AI Capabilities in Chrome: Configuration and Flags Guide

<table>
  <thead>
    <tr>
      <th>API</th>
      <th>Status</th>
      <th>Links</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Prompt API (Chat)</td>
      <td id="prompt-status">Loading...</td>
      <td><a href="/Chat-API">AI Chat Example</a></td>
    </tr>
    <tr>
      <td>AISummarizer</td>
      <td id="summarizer-status">Loading...</td>
      <td><a href="/Summary-API">Summary Example</a></td>
    </tr>
    <tr>
      <td>Language Translation API</td>
      <td id="translation-status">Loading...</td>
      <td><a href="/Translate-API">Translation</a></td>
    </tr>
    <tr>
      <td>Writer and Rewriter API</td>
      <td id="writer-status">Loading...</td>
      <td><a href="/Writer-ReWriter-API">Writer and Re-Writer</a></td>
    </tr>
  </tbody>
</table>


<script>
   function updateStatus(apiName, elementId) {
     window.ai[apiName].capabilities().then((res) => {
       document.getElementById(elementId).textContent = res.available ? "Available" : "Unavailable";
     }).catch(() => {
       document.getElementById(elementId).textContent = "Error";
     });
   }
   
   if ('translation' in self && 'createTranslator' in self.translation) {
       document.getElementById('translation-status').textContent = "Available";
   } else {
      document.getElementById('translation-status').textContent = "Unavailable";
   }
   
   updateStatus('languageModel', 'prompt-status');
   updateStatus('languageModel', 'writer-status'); 
   updateStatus('summarizer', 'summarizer-status');
</script>


### Prompt API (Chat)

1. **Chrome Flags**:
    - Enable Gemini Nano:
        - Navigate to `chrome://flags/#optimization-guide-on-device-model` and enable `BypassPerfRequirement`.
    - Enable Prompt API:
        - Navigate to `chrome://flags/#prompt-api-for-gemini-nano` and enable it.
2. **Chrome Components**:
   - Go to `chrome://components`, 
     - find "Optimization Guide On Device Model" and click "Check for Update".
3. **Model Verification**:
    - Verify availability in Chrome DevTools with `(await ai.languageModel.capabilities()).available;`.

### AISummarizer

1. **Chrome Flags**:
    - Enable Gemini Nano:
        - Navigate to `chrome://flags/#optimization-guide-on-device-model` and enable `BypassPerfRequirement`.
    - Enable Summarization API:
        - Navigate to `chrome://flags/#summarization-api-for-gemini-nano` and enable it.

2. **Model Setup**:
    - Use Chrome DevTools to confirm model setup with `await ai.summarizer.capabilities();`.

### Language Translation API

1. **Chrome Flags**:
    - Enable Language Detection API:
        - Navigate to `chrome://flags/#language-detection-api` and enable it.
    - Enable Translation API:
        - Navigate to `chrome://flags/#translation-api` and choose the appropriate option.

2. **Language Pack Management**:
    - Use `chrome://on-device-translation-internals/` to manage language packs.

### Writer and Rewriter API

1. **Chrome Flags**:
    - Enable Gemini Nano:
        - Navigate to `chrome://flags/#optimization-guide-on-device-model` and set to `Enabled BypassPerfRequirement`.
    - Enable Writer API:
        - Go to `chrome://flags/#writer-api-for-gemini-nano` and enable it.
    - Enable Rewriter API:
        - Go to `chrome://flags/#rewriter-api-for-gemini-nano` and enable it.

2. **Model Verification**:
    - Confirm setup with `(await ai.languageModel.capabilities()).available;` in Chrome DevTools.



