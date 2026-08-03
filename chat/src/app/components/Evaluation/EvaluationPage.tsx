import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSEOData, seoConfigs } from '../../hooks/useSEOData';
import Tabs from '../Tabs';
import { DocsRenderer } from '../../tools/DocsRenderer';
import { MiniEval } from './MiniEval';

export const EvaluationPage: React.FC = () => {
  const location = useLocation();
  // Use startsWith (NOT includes) — exact-prefix match, mirroring the other pages.
  const isDocs = location.pathname.startsWith('/evaluation/docs');
  useSEOData(
    isDocs ? seoConfigs.evaluationDocs : seoConfigs.evaluation,
    isDocs ? '/evaluation/docs' : '/evaluation',
  );

  // Docs tab FIRST (its path '/docs' is matched by Tabs; the demo tab has the
  // falsy path '' and is the default fallback for /evaluation).
  const tabs = useMemo(
    () => [
      {
        id: 'docs',
        label: 'API Documentation',
        path: '/docs',
        content: (
          <div className="max-w-none">
            <DocsRenderer docFile="Evaluation-API.md" initOpen={true} />
          </div>
        ),
      },
      {
        id: 'demo',
        label: 'Demo',
        path: '',
        content: <MiniEval />,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Evaluation</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            On-device models are small and can be confidently wrong — so you test them. Run a live
            mini-eval below, then learn how to score answer quality and wire it into CI.
          </p>
        </header>
        <Tabs basePath="/evaluation" defaultTab="docs" tabs={tabs} />
        <p className="mt-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          🔒 The demo runs entirely on-device — open DevTools → Network tab
        </p>
      </div>
    </div>
  );
};

export default EvaluationPage;
