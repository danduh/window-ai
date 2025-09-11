import React, {useState} from 'react';
import {Routes, Route, Navigate, Link, useSearchParams} from 'react-router-dom';
import ChatPage from './components/ChatPage';
import ToolCallingPage from './components/ToolCallingPage';
import Summary from "./components/Summary";
import TranslatePage from "./components/TranslatePage";
import WriteRewritePage from "./components/WriteRewritePage";
import {HomePage} from "./components/HomePage";
import {AppContext} from "./context";
import {ThemeProvider} from "./context/ThemeContext";
import {useGoogleAnalytics} from "./hooks/useGoogleAnalytics";

const AppRouter: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inIframe] = useState<boolean>(() => {
    try {
      return searchParams.get('inIframe') ? JSON.parse(searchParams.get('inIframe') as string) : false;
    } catch {
      return false;
    }
  });
  
  // Initialize Google Analytics tracking
  const { trackUserInteraction } = useGoogleAnalytics();
  
  const mainContext = {
    inIframe
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    trackUserInteraction('menu_toggle', 'mobile_menu', { opened: !isMenuOpen });
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        {!inIframe && (
          <nav className="bg-white dark:bg-gray-800 shadow-md transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <span className="text-xl font-bold text-gray-800 dark:text-white">AI Tools</span>
                  </div>
                </div>
                <div className="hidden sm:flex sm:items-center sm:space-x-6">
                  <div className="flex space-x-4">
                    <Link to="/"
                          onClick={() => trackUserInteraction('navigation_click', 'home_link')}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Home</Link>
                    <Link to="/chat/chat-api-documentation"
                          onClick={() => trackUserInteraction('navigation_click', 'chat_link')}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Chat</Link>
                    <Link to="/tool-calling"
                          onClick={() => trackUserInteraction('navigation_click', 'tool_calling_link')}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Tool Calling</Link>
                    <Link to="/summary"
                          onClick={() => trackUserInteraction('navigation_click', 'summary_link')}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Summary</Link>
                    <Link to="/translate"
                          onClick={() => trackUserInteraction('navigation_click', 'translate_link')}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Translate</Link>
                    <Link to="/writer"
                          onClick={() => trackUserInteraction('navigation_click', 'writer_link')}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Writer/Rewriter</Link>
                  </div>
                  <div className="flex items-center space-x-3 border-l border-gray-300 dark:border-gray-600 pl-6">
                    <a href="https://github.com/danduh/window-ai" target="_blank" rel="noopener noreferrer" title="GitHub" 
                       onClick={() => trackUserInteraction('external_link_click', 'github')}
                       className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="currentColor">
                        <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6m-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3m44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9M244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8M97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1m-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7m32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1m-11.4-14.7c-1.6 1-1.6 3.6 0 5.9s4.3 3.3 5.6 2.3c1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2"/>
                      </svg>
                    </a>
                    <a href="https://x.com/danduh81" target="_blank" rel="noopener noreferrer" title="X (Twitter)" 
                       onClick={() => trackUserInteraction('external_link_click', 'twitter')}
                       className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z"/>
                      </svg>
                    </a>
                    <a href="https://www.linkedin.com/in/danduh/" target="_blank" rel="noopener noreferrer" title="LinkedIn" 
                       onClick={() => trackUserInteraction('external_link_click', 'linkedin')}
                       className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3M135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5m282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9z"/>
                      </svg>
                    </a>
                    <a href="https://www.youtube.com/@danduh81" target="_blank" rel="noopener noreferrer" title="YouTube" 
                       onClick={() => trackUserInteraction('external_link_click', 'youtube')}
                       className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor">
                        <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305m-317.51 213.508V175.185l142.739 81.205z"/>
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="-mr-2 flex items-center sm:hidden">
                  <button
                    onClick={toggleMenu}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors duration-200"
                    aria-expanded="false"
                  >
                    <span className="sr-only">Open main menu</span>
                    <svg
                      className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                    <svg
                      className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
              <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                <Link to="/"
                      onClick={() => trackUserInteraction('navigation_click', 'home_link_mobile')}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Home</Link>
                <Link to="/chat/chat-api-documentation"
                      onClick={() => trackUserInteraction('navigation_click', 'chat_link_mobile')}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Chat</Link>
                <Link to="/tool-calling"
                      onClick={() => trackUserInteraction('navigation_click', 'tool_calling_link_mobile')}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Tool Calling</Link>
                <Link to="/summary"
                      onClick={() => trackUserInteraction('navigation_click', 'summary_link_mobile')}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Summary</Link>
                <Link to="/translate"
                      onClick={() => trackUserInteraction('navigation_click', 'translate_link_mobile')}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Translate</Link>
                <Link to="/writer"
                      onClick={() => trackUserInteraction('navigation_click', 'writer_link_mobile')}
                      className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200">Writer/Rewriter</Link>
                
                <div className="border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                  <div className="flex items-center justify-center space-x-6">
                    <a href="https://github.com/danduh/window-ai" target="_blank" rel="noopener noreferrer" title="GitHub" 
                       onClick={() => trackUserInteraction('external_link_click', 'github')}
                       className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" fill="currentColor">
                        <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6m-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3m44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9M244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8M97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1m-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7m32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1m-11.4-14.7c-1.6 1-1.6 3.6 0 5.9s4.3 3.3 5.6 2.3c1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2"/>
                      </svg>
                    </a>
                    <a href="https://x.com/danduh81" target="_blank" rel="noopener noreferrer" title="X (Twitter)" 
                       onClick={() => trackUserInteraction('external_link_click', 'twitter')}
                       className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42z"/>
                      </svg>
                    </a>
                    <a href="https://www.linkedin.com/in/danduh/" target="_blank" rel="noopener noreferrer" title="LinkedIn" 
                       onClick={() => trackUserInteraction('external_link_click', 'linkedin')}
                       className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3M135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5m282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9z"/>
                      </svg>
                    </a>
                    <a href="https://www.youtube.com/@danduh81" target="_blank" rel="noopener noreferrer" title="YouTube" 
                       onClick={() => trackUserInteraction('external_link_click', 'youtube')}
                       className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor">
                        <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305m-317.51 213.508V175.185l142.739 81.205z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        )}
        <AppContext.Provider value={mainContext}>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<HomePage/>}/>
              
              {/* Chat routes */}
              <Route path="/chat" element={<Navigate to="/chat/chat-api-documentation" replace/>}/>
              <Route path="/chat/chat-api-documentation" element={<ChatPage/>}/>
              <Route path="/chat/chat-demo" element={<ChatPage/>}/>
              
              {/* Tool Calling routes */}
              <Route path="/tool-calling" element={<Navigate to="/tool-calling/tool-calling-api-documentation" replace/>}/>
              <Route path="/tool-calling/tool-calling-api-documentation" element={<ToolCallingPage/>}/>
              <Route path="/tool-calling/tool-calling-demo" element={<ToolCallingPage/>}/>
              
              {/* Summary routes */}
              <Route path="/summary" element={<Navigate to="/summary/summary-api-documentation" replace/>}/>
              <Route path="/summary/summary-api-documentation" element={<Summary/>}/>
              <Route path="/summary/summary-demo" element={<Summary/>}/>
              
              {/* Translate routes */}
              <Route path="/translate" element={<Navigate to="/translate/translate-api-documentation" replace/>}/>
              <Route path="/translate/translate-api-documentation" element={<TranslatePage/>}/>
              <Route path="/translate/translate-demo" element={<TranslatePage/>}/>
              
              {/* Writer/Rewriter routes */}
              <Route path="/writer" element={<Navigate to="/writer/writer-api-documentation" replace/>}/>
              <Route path="/writer/writer-api-documentation" element={<WriteRewritePage/>}/>
              <Route path="/writer/writer-demo" element={<WriteRewritePage/>}/>
              <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
          </main>
        </AppContext.Provider>
      </div>
    </ThemeProvider>
  );
};

export default AppRouter;