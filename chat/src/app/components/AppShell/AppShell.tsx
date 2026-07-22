import React from 'react';
import { SidebarRail } from './SidebarRail';
import { TopBar } from './TopBar';
import { useShell } from './ShellContext';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Global chrome for the app: collapsible left sidebar rail + sticky top bar,
 * with the routed pages rendered inside a scrollable main column.
 *
 * Dark is the default palette; it flips with the ThemeProvider's `dark` class
 * on <html> (see `.app-shell` custom properties in global.css). In present
 * mode the rail is hidden and the base font is bumped so em-based content
 * (the redesigned HomePage) scales up.
 */
export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { present } = useShell();

  return (
    <div
      className="app-shell flex h-screen overflow-hidden"
      style={{
        background: 'var(--page)',
        fontSize: present ? '20px' : '15px',
      }}
    >
      {!present && <SidebarRail />}

      <div
        className="om-scroll flex-1 overflow-y-auto overflow-x-hidden"
        style={{ background: 'var(--page)' }}
      >
        <TopBar />
        {children}
      </div>
    </div>
  );
};

export default AppShell;
