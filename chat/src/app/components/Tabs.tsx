import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  path?: string; // URL path for the tab
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  basePath?: string; // Base path for constructing URLs
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab, basePath = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine initial tab based on URL or default
  const getInitialTab = () => {
    if (basePath) {
      const currentPath = location.pathname;
      const tab = tabs.find(t => t.path && currentPath.includes(t.path));
      if (tab) return tab.id;
    }
    return defaultTab || tabs[0]?.id;
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  // Update active tab when location changes
  useEffect(() => {
    if (basePath) {
      const currentPath = location.pathname;
      const tab = tabs.find(t => t.path && currentPath.includes(t.path));
      if (tab) {
        setActiveTab(tab.id);
      }
    }
  }, [location.pathname, basePath, tabs]);
  
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Update URL if basePath and tab path are provided
    const tab = tabs.find(t => t.id === tabId);
    if (basePath && tab?.path) {
      navigate(`${basePath}${tab.path}`);
    }
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTabContent}
      </div>
    </div>
  );
};

export default Tabs;
