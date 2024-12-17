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

  return (
    <div className="main-wrapper">
      {!inIframe &&
          <nav>
              <ul>
                  <li><Link to="/">Home</Link></li>
                  <li><Link to="/chat">Chat</Link></li>
                  <li><Link to="/summary">Summary</Link></li>
                  <li><Link to="/tranlate">Translate</Link></li>
                  <li><Link to="/writer">Writer/Rewriter</Link></li>
              </ul>
          </nav>
      }
      <AppContext.Provider value={mainContext}>
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/chat" element={<ChatPage/>}/>
          <Route path="/summary" element={<Summary/>}/>
          <Route path="/summary" element={<Summary/>}/>
          <Route path="/tranlate" element={<TranslatePage/>}/>
          <Route path="/writer" element={<WriteRewritePage/>}/>
          {/*<Route path="*" element={<Navigate to="/chat" replace/>}/>*/}
        </Routes>
      </AppContext.Provider>
    </div>
  );
};

export default AppRouter;