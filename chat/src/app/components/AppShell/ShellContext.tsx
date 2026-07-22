import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

/**
 * Global UI-shell state, shared between the AppShell chrome (rail + top bar)
 * and the pages it hosts (notably HomePage, which reacts to `present`).
 *
 * - `present`  — presentation mode. Owns the P / Esc keyboard handler here so
 *                any page inside the shell can read it without duplicating it.
 * - `railOpen` — sidebar rail expanded (desktop) / drawer open (mobile).
 *
 * Setters are the raw React state dispatchers, so callers can pass either a
 * value (`setPresent(true)`) or an updater (`setPresent(p => !p)`).
 */
export interface ShellContextValue {
  present: boolean;
  setPresent: React.Dispatch<React.SetStateAction<boolean>>;
  railOpen: boolean;
  setRailOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

export const useShell = (): ShellContextValue => {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return ctx;
};

interface ShellProviderProps {
  children: React.ReactNode;
}

export const ShellProvider: React.FC<ShellProviderProps> = ({ children }) => {
  const [present, setPresent] = useState(false);
  // Desktop starts expanded; small screens start with the drawer closed.
  // Treat an unknown / not-yet-measured width (SSR, or a pane that reports 0
  // during initial load) as desktop so the rail opens with labels by default —
  // only a definitely-narrow (< 768) viewport starts the drawer closed.
  const [railOpen, setRailOpen] = useState(
    () =>
      typeof window === 'undefined' ||
      !window.innerWidth ||
      window.innerWidth >= 768
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPresent((p) => !p);
      } else if (e.key === 'Escape') {
        setPresent(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ShellContext.Provider
      value={{ present, setPresent, railOpen, setRailOpen }}
    >
      {children}
    </ShellContext.Provider>
  );
};
