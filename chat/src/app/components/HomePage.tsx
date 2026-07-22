import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import { ApiStatusGrid } from './ApiStatus';

// Full demo index — every interactive page in the app.
const DEMOS: { href: string; label: string; desc: string }[] = [
  { href: '/chat', label: 'Chat', desc: 'Conversational Gemini Nano' },
  { href: '/tool-calling', label: 'Tool calling', desc: 'Structured JSON + tools' },
  { href: '/multimodal', label: 'Multimodal', desc: 'Image & webcam input' },
  { href: '/summary', label: 'Summarize', desc: 'Key-points / TL;DR / headline' },
  { href: '/translate', label: 'Translate', desc: 'Translate + detect language' },
  { href: '/live-translate', label: 'Live translate', desc: 'Speech → live translation' },
  { href: '/writer', label: 'Write & Rewrite', desc: 'Draft and transform text' },
  { href: '/proofreader', label: 'Proofread', desc: 'Positioned grammar fixes' },
  { href: '/embeddings', label: 'Embeddings', desc: 'Semantic vectors: cross-lingual search & clustering' },
  { href: '/webmcp', label: 'WebMCP', desc: 'Page as agent tools' },
  { href: '/generative-ui', label: 'Generative UI', desc: 'Tool-driven UI (WebMCP)' },
  { href: '/mcp-client', label: 'MCP Client', desc: 'Chat with a remote MCP server via the built-in LLM' },
];

export const HomePage: React.FC = () => {
  useSEOData(seoConfigs.home, '/');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chrome Built-in AI APIs</h1>
              <p className="text-gray-600 dark:text-gray-400">On-device AI for web apps — live status for your browser</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Introduction */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors duration-200">
          <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
            Chrome ships a set of built-in AI APIs that run <strong>on-device</strong> via Gemini Nano —
            no backend, no API keys, no per-request cost, and no data leaving the browser. Some are stable,
            others are in an origin trial or behind a flag. The status on each card below is checked
            <strong> live in your current browser</strong>.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
            <LegendRow dot="bg-green-500" label="Ready — usable now" />
            <LegendRow dot="bg-blue-500" label="Ready · downloads on first use" />
            <LegendRow dot="bg-amber-500" label="Downloading the model" />
            <LegendRow dot="bg-gray-400" label="Unavailable — see “How to enable”" />
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Requires a desktop Chrome 150+ (Windows, macOS, Linux) that meets the Gemini Nano hardware bar
            (~22&nbsp;GB free disk, &gt;4&nbsp;GB VRAM or 16&nbsp;GB RAM). After enabling a flag, relaunch Chrome.
          </p>
        </div>

        {/* Live API status cards */}
        <ApiStatusGrid />

        {/* All demos */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-3 rounded-xl mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Try the demos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DEMOS.map((d) => (
              <Link
                key={d.href}
                to={d.href}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 group"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300">
                    {d.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{d.desc}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Status verified against the Chrome for Developers docs (July 2026, Chrome 150). These APIs are
            evolving — flags and availability can change between releases.
          </p>
        </div>
      </div>
    </div>
  );
};

const LegendRow: React.FC<{ dot: string; label: string }> = ({ dot, label }) => (
  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
    <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
    {label}
  </div>
);

export default HomePage;
