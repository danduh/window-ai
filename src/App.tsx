import React, { useState } from 'react';
import ChatBox from './components/ChatBox';
import ChatInput from './components/ChatInput';
import './App.css';

interface Message {
  id: number;
  text: string;
  sender: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sender, setSender] = useState<string>('User'); // default sender

  const addMessage = (text: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      text,
      sender,
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="app">
      <h1>Simple Chat</h1>
      <ChatBox messages={messages} />
      <ChatInput onSend={addMessage} />
    </div>
  );
};

export default App;
