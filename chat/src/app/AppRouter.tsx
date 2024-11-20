import React from 'react';
import {Routes, Route, Navigate, Link} from 'react-router-dom';
import ChatPage from './components/ChatPage';
import Summary from "./components/Summary";
import TranslatePage from "./components/TranslatePage";
import WriteRewritePage from "./components/WriteRewritePage";

const AppRouter: React.FC = () => {
  return (
    <div>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/chat">Chat</Link></li>
          <li><Link to="/summary">Summary</Link></li>
          <li><Link to="/tranlate">Translate</Link></li>
          <li><Link to="/writer">Writer/Rewriter</Link></li>
        </ul>
      </nav>
      <Routes>
        <Route path="/chat" element={<ChatPage/>}/>
        <Route path="/summary" element={<Summary/>}/>
        <Route path="/tranlate" element={<TranslatePage/>}/>
        <Route path="/writer" element={<WriteRewritePage/>}/>
        <Route path="*" element={<Navigate to="/chat" replace/>}/>
      </Routes>
    </div>
  );
};

export default AppRouter;