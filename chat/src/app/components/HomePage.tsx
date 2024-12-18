import React from 'react';
import { Link } from 'react-router-dom';

const APISection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-bold mb-4">{title}</h2>
    {children}
  </div>
);

const FlagInstruction = ({ flag, description }: { flag: string; description: string }) => (
  <li className="mb-2">
    <span className="font-semibold">{flag}:</span> {description}
  </li>
);

export const HomePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Chrome AI APIs: Experimental Features</h1>

      <p className="mb-6">
        Chrome now offers a set of experimental AI capabilities through built-in APIs. These features are cutting-edge and require specific configuration to enable. Below, you'll find an overview of each API and instructions on how to activate them.
      </p>

      <APISection title="Prompt API (Chat)">
        <p className="mb-4">The Prompt API allows for interactive chat-like interactions with the AI model.</p>
        <h3 className="text-xl font-semibold mb-2">How to Enable:</h3>
        <ol className="list-decimal list-inside mb-4">
          <FlagInstruction
            flag="Enable Gemini Nano"
            description='Navigate to chrome://flags/#optimization-guide-on-device-model and enable "BypassPerfRequirement"'
          />
          <FlagInstruction
            flag="Enable Prompt API"
            description='Navigate to chrome://flags/#prompt-api-for-gemini-nano and enable it'
          />
        </ol>
        <p>Verify availability in Chrome DevTools with: <code className="bg-gray-100 p-1 rounded">(await ai.languageModel.capabilities()).available;</code></p>
      </APISection>

      <APISection title="AI Summarizer">
        <p className="mb-4">The AI Summarizer API provides text summarization capabilities.</p>
        <h3 className="text-xl font-semibold mb-2">How to Enable:</h3>
        <ol className="list-decimal list-inside mb-4">
          <FlagInstruction
            flag="Enable Gemini Nano"
            description='Navigate to chrome://flags/#optimization-guide-on-device-model and enable "BypassPerfRequirement"'
          />
          <FlagInstruction
            flag="Enable Summarization API"
            description='Navigate to chrome://flags/#summarization-api-for-gemini-nano and enable it'
          />
        </ol>
        <p>Confirm model setup in Chrome DevTools with: <code className="bg-gray-100 p-1 rounded">await ai.summarizer.capabilities();</code></p>
      </APISection>

      <APISection title="Language Translation API">
        <p className="mb-4">The Language Translation API offers translation capabilities between different languages.</p>
        <h3 className="text-xl font-semibold mb-2">How to Enable:</h3>
        <ol className="list-decimal list-inside mb-4">
          <FlagInstruction
            flag="Enable Language Detection API"
            description='Navigate to chrome://flags/#language-detection-api and enable it'
          />
          <FlagInstruction
            flag="Enable Translation API"
            description='Navigate to chrome://flags/#translation-api and choose the appropriate option'
          />
        </ol>
        <p>Manage language packs at: <code className="bg-gray-100 p-1 rounded">chrome://on-device-translation-internals/</code></p>
      </APISection>

      <APISection title="Writer and Rewriter API">
        <p className="mb-4">The Writer and Rewriter APIs provide AI-assisted writing and text rewriting capabilities.</p>
        <h3 className="text-xl font-semibold mb-2">How to Enable:</h3>
        <ol className="list-decimal list-inside mb-4">
          <FlagInstruction
            flag="Enable Gemini Nano"
            description='Navigate to chrome://flags/#optimization-guide-on-device-model and set to "Enabled BypassPerfRequirement"'
          />
          <FlagInstruction
            flag="Enable Writer API"
            description='Go to chrome://flags/#writer-api-for-gemini-nano and enable it'
          />
          <FlagInstruction
            flag="Enable Rewriter API"
            description='Go to chrome://flags/#rewriter-api-for-gemini-nano and enable it'
          />
        </ol>
        <p>Confirm setup in Chrome DevTools with: <code className="bg-gray-100 p-1 rounded">(await ai.languageModel.capabilities()).available;</code></p>
      </APISection>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Try the APIs</h2>
        <p className="mb-4">Now that you've enabled the APIs, you can try them out in our demo application:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><Link to="/chat" className="text-blue-500 hover:underline">Chat with AI</Link></li>
          <li><Link to="/summary" className="text-blue-500 hover:underline">Summarize Text</Link></li>
          <li><Link to="/translate" className="text-blue-500 hover:underline">Translate Languages</Link></li>
          <li><Link to="/write-rewrite" className="text-blue-500 hover:underline">Write and Rewrite</Link></li>
        </ul>
      </div>
    </div>
  );
}


