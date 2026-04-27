import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ThemeToggle from './ThemeToggle';
import Tabs from './Tabs';
import { useSEOData, seoConfigs } from '../hooks/useSEOData';
import {
  getRecipes,
  seedIfEmpty,
  type Recipe,
} from '../services/RecipePersistence';
import { SEED_RECIPES } from '../services/recipeSeed';
import { RecipePicker } from './RecipeWorkbench/RecipePicker';
import { RecipeHeader } from './RecipeWorkbench/RecipeHeader';
import { IngredientsList } from './RecipeWorkbench/IngredientsList';
import { StepsList } from './RecipeWorkbench/StepsList';
import { MissingFlagBanner } from './RecipeWorkbench/MissingFlagBanner';
import { RECIPE_TOOLS } from '../services/recipeTools';
import { wrapToolsWithEvents, type ToolCallEvent } from '../services/toolAdapter';
import { subscribeRecipeStore, setActiveRecipeId } from '../services/recipeStore';
import { ToolRegistrationPill, type ToolRegistrationStatus } from './RecipeWorkbench/ToolRegistrationPill';
import { AgentDrawer } from './RecipeWorkbench/AgentDrawer';

interface WorkbenchPanelProps {
  recipes: Recipe[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
}

const WorkbenchPanel: React.FC<WorkbenchPanelProps> = ({ recipes, activeId, loading, onSelect }) => {
  const active = recipes.find((r) => r.id === activeId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1">
        {!loading && recipes.length > 0 && (
          <RecipePicker recipes={recipes} activeId={activeId} onSelect={onSelect} />
        )}
      </aside>
      <section className="lg:col-span-3 space-y-6">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading your recipes&hellip;</p>
        ) : !active ? (
          <p className="text-gray-500 dark:text-gray-400">No recipes yet. Reload the page to seed the demo recipes.</p>
        ) : (
          <>
            <RecipeHeader title={active.title} servings={active.servings} />
            <IngredientsList ingredients={active.ingredients} />
            <StepsList steps={active.steps} />
          </>
        )}
      </section>
    </div>
  );
};

interface RegistrationState {
  status: ToolRegistrationStatus;
  count: number;
}

export const RecipeWorkbenchPage: React.FC = () => {
  useSEOData(seoConfigs.webmcp, '/webmcp');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [registration, setRegistration] = useState<RegistrationState>({ status: 'idle', count: 0 });
  const [liveToolName, setLiveToolName] = useState<string | null>(null);

  // Mount-time: idempotent seed (count-gated in seedIfEmpty), then load.
  // The `cancelled` flag handles React 19 StrictMode double-invoke per
  // RESEARCH §Pitfall 1.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await seedIfEmpty(SEED_RECIPES);
        const all = await getRecipes();
        if (cancelled) return;
        setRecipes(all);
        setActiveId(all[0]?.id ?? null);
        setActiveRecipeId(all[0]?.id ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        // eslint-disable-next-line no-console
        console.error('[RecipeWorkbench] Failed to load recipes:', message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tool registration mount-effect. Single AbortController per mount;
  // controller.abort() in cleanup unregisters every tool atomically (per W3C
  // WebMCP spec — there is no separate `unregisterTool` method).
  // See 02-RESEARCH.md §Pattern 1 + §Pitfall 1 (empty deps) + §Pitfall 2 (controller inside effect).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.modelContext) {
      setRegistration({ status: 'unavailable', count: 0 });
      return;
    }
    const controller = new AbortController();
    // Wrap every tool with the SAME event dispatcher used by AgentDrawer's session,
    // so external-agent calls (Tool Inspector) also fire the indicator UI.
    // setLiveToolName is a stable React setter — satisfies AgentDrawer's
    // `onLiveToolNameChange` "Pass a stable callback" contract (I1 fix).
    const onToolEvent = (e: ToolCallEvent): void => {
      if (e.kind === 'pending') {
        setLiveToolName(e.toolName);
      } else {
        setLiveToolName(null);
      }
    };
    const wrapped = wrapToolsWithEvents(RECIPE_TOOLS, onToolEvent);
    const registered: string[] = [];
    try {
      for (const tool of wrapped) {
        navigator.modelContext.registerTool(tool, { signal: controller.signal });
        registered.push(tool.name);
      }
      setRegistration({ status: 'success', count: registered.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.error('[RecipeWorkbench] Tool registration failed:', message);
      setRegistration({
        status: registered.length > 0 ? 'partial' : 'error',
        count: registered.length,
      });
    }
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to recipeStore. Mutating tool handlers call notifyRecipeStore()
  // after saveRecipe(); the listener re-fetches and updates React state.
  // See 02-RESEARCH.md §Pattern 3 + §Pitfall #5.
  useEffect(() => {
    const unsub = subscribeRecipeStore(() => {
      getRecipes()
        .then((all) => setRecipes(all))
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          // eslint-disable-next-line no-console
          console.error('[RecipeWorkbench] Failed to refresh recipes after store notify:', message);
        });
    });
    return unsub;
  }, []);

  // Mirror activeId into recipeStore (handlers default to getActiveRecipeId()
  // when no recipeId arg is passed by the agent). Stable callback (empty deps)
  // — `setActiveId` and `setActiveRecipeId` are both stable references.
  const handleSelect = useCallback((id: string): void => {
    setActiveId(id);
    setActiveRecipeId(id);
  }, []);

  // Tabs ordering gotcha (PATTERNS §RecipeWorkbenchPage): the docs tab MUST be
  // listed BEFORE the workbench tab so `/webmcp/docs` wins the
  // `currentPath.includes(tab.path)` lookup over the workbench's empty path.
  const tabs = useMemo(
    () => [
      {
        id: 'docs',
        label: 'Docs',
        path: '/docs',
        content: (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <p className="text-gray-600 dark:text-gray-400">
              Documentation coming in Phase 3 &mdash; see{' '}
              <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded font-mono text-sm">WebMCP-API.md</code>.
            </p>
          </div>
        ),
      },
      {
        id: 'workbench',
        label: 'Workbench',
        path: '',
        content: (
          <>
            <WorkbenchPanel
              recipes={recipes}
              activeId={activeId}
              loading={loading}
              onSelect={handleSelect}
            />
            <AgentDrawer
              registrationStatus={registration.status}
              registeredCount={registration.count}
              liveToolName={liveToolName}
              onLiveToolNameChange={setLiveToolName}
            />
          </>
        ),
      },
    ],
    [recipes, activeId, loading, handleSelect, registration.status, registration.count, liveToolName],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-200">
      <div className="max-w-6xl mx-auto p-4">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-primary-500 to-purple-600 text-white p-3 rounded-xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recipe Workbench</h1>
              <p className="text-gray-600 dark:text-gray-400">A WebMCP demo: tools live on the page, not on a server.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ToolRegistrationPill
              status={registration.status}
              registeredCount={registration.count}
              totalCount={RECIPE_TOOLS.length}
            />
            <ThemeToggle />
          </div>
        </header>

        {!navigator.modelContext && <MissingFlagBanner />}

        <Tabs basePath="/webmcp" defaultTab="workbench" tabs={tabs} />
      </div>
    </div>
  );
};

export default RecipeWorkbenchPage;
