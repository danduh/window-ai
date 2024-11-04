# chrome-llm-ts

To use this library in your code, follow these steps:

1. **Install the Library** (if it's published to npm):
   ```bash
   npm install chrome-llm-ts
   ```

2. **Set Up Type Declarations for Global Usage**:
   Since you're accessing `window.ai.languageModel` directly, you need to make TypeScript aware of the types for the `ai` object on `window`. This involves adding a global augmentation.

3. **Create a Declaration File for Global Scope**:

   In your project (not the library), create a TypeScript declaration file, e.g., `global.d.ts`, to declare the `Window` interface and its `ai` property.

   ```typescript
   // global.d.ts
   import type { AI } from 'chrome-llm-ts';

   declare global {
     interface Window {
       ai: AI;
     }
   }
   ```

   Ensure TypeScript picks up this file by adding it to `tsconfig.json` under `include`:

   ```json
   {
     "compilerOptions": {
       "strict": true,
       "module": "commonjs",
       "target": "es6"
     },
     "include": ["src", "global.d.ts"]
   }
   ```

4. **Use the Library in Your Code**:

   After setting up the types, you can directly use `window.ai.languageModel` as follows:

   ```typescript
   // main.ts
   import 'chrome-llm-ts'; // Import to ensure all types and side effects are available

   async function initialize() {
     if (window.ai) {
       const languageModel = await window.ai.languageModel.create();
       const response = await languageModel.prompt("Hello AI!");
       console.log("AI Response:", response);
     } else {
       console.error("AI SDK is not available on window.ai.");
     }
   }

   initialize();
   ```

### Summary

- Define `window.ai` as a global property using a `global.d.ts` file.
- Import `chrome-llm-ts` in your main file to ensure all types and interfaces are available.
- Access `window.ai.languageModel` directly with TypeScript autocompletion and type safety.