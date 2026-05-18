import { useState, useEffect } from 'react';
import { subscribeMealPlanStore, getPlan } from '../services/MealPlanStore';
import type { PlanEntry } from '../services/RecipePersistence';

/** Result type returned by useMealPlan. */
export interface UseMealPlanResult {
  plan: PlanEntry[];
  loading: boolean;
}

/**
 * React hook that subscribes to MealPlanStore and returns { plan, loading }.
 * Uses Shape B (useState + two effects) mirroring RecipeWorkbenchPage.tsx:233-244.
 * StrictMode-safe via the cancelled flag in the initial-load effect.
 */
export const useMealPlan = (): UseMealPlanResult => {
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load — StrictMode-safe with cancelled flag (avoids setState after unmount).
  useEffect(() => {
    let cancelled = false;
    getPlan()
      .then((entries) => {
        if (!cancelled) {
          setPlan(entries);
          setLoading(false);
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        // eslint-disable-next-line no-console
        console.error('[useMealPlan] Failed to load plan:', message);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to future mutations via MealPlanStore pub-sub.
  useEffect(() => {
    const unsub = subscribeMealPlanStore(() => {
      getPlan()
        .then((entries) => setPlan(entries))
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Unknown error';
          // eslint-disable-next-line no-console
          console.error('[useMealPlan] Failed to refresh plan after store notify:', message);
        });
    });
    return unsub;
  }, []);

  return { plan, loading };
};
