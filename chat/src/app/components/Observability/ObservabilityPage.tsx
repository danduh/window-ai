import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSEOData, seoConfigs } from '../../hooks/useSEOData';
import Tabs from '../Tabs';
import { DocsRenderer } from '../../tools/DocsRenderer';
import { TraceDemo } from './TraceDemo';

export const ObservabilityPage: React.FC = () => {
  const location = useLocation();
  const isDocs = location.pathname.endsWith('-api-documentation');
  useSEOData(
    isDocs ? seoConfigs.observabilityDocs : seoConfigs.observability,
    isDocs ? '/observability/observability-api-documentation' : '/observability/observability-demo',
  );

  // Docs tab first; every tab has a real path and Tabs derives the active tab from the URL.
  const tabs = useMemo(
    () => [
      {
        id: 'docs',
        label: 'API Documentation',
        path: '/observability-api-documentation',
        content: (
          <div className="max-w-none">
            <DocsRenderer docFile="Observability-API.md" initOpen={true} />
          </div>
        ),
      },
      {
        id: 'demo',
        label: 'Demo',
        path: '/observability-demo',
        content: <TraceDemo />,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Observability</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Trace, log, and monitor Chrome&apos;s built-in on-device AI — entirely client-side, no
            backend. See what you can capture, then learn how to add logging and tracing to your own
            app.
          </p>
        </header>
        <Tabs basePath="/observability" defaultTab="docs" tabs={tabs} />
        <p className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          🔒 Everything here stays in your browser — open DevTools → Network tab
        </p>
      </div>
    </div>
  );
};

export default ObservabilityPage;
