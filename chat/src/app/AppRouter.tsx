import React, {useState} from 'react';
import {Routes, Route, Navigate, Link, useSearchParams} from 'react-router-dom';
import ChatPage from './components/ChatPage';
import Summary from "./components/Summary";
import TranslatePage from "./components/TranslatePage";
import WriteRewritePage from "./components/WriteRewritePage";
import {HomePage} from "./components/HomePage";
import {AppContext} from "./context";

const AppRouter: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inIframe, seInIframe] = useState<boolean>(() => {
    try {
      return searchParams.get('inIframe') ? JSON.parse(searchParams.get('inIframe') as string) : false;
    } catch (er) {
      return false;
    }
  });
  const mainContext = {
    inIframe
  };
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!inIframe && (
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-gray-800">AI Tools</span>
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <div className="flex space-x-4">
                  <Link to="/"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                  <Link to="/chat"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Chat</Link>
                  <Link to="/summary"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Summary</Link>
                  <Link to="/translate"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Translate</Link>
                  <Link to="/writer"
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Writer/Rewriter</Link>
                </div>
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                <button
                  onClick={toggleMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
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
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link to="/"
                    className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">Home</Link>
              <Link to="/chat"
                    className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">Chat</Link>
              <Link to="/summary"
                    className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">Summary</Link>
              <Link to="/translate"
                    className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">Translate</Link>
              <Link to="/writer"
                    className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">Writer/Rewriter</Link>
            </div>
          </div>
        </nav>
      )}
      <AppContext.Provider value={mainContext}>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/chat" element={<ChatPage/>}/>
            <Route path="/summary" element={<Summary/>}/>
            <Route path="/translate" element={<TranslatePage/>}/>
            <Route path="/writer" element={<WriteRewritePage/>}/>
            <Route path="*" element={<Navigate to="/" replace/>}/>
          </Routes>
        </main>
      </AppContext.Provider>
    </div>

  );
};

export default AppRouter;