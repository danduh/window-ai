import React, {useState} from 'react';
import ChatBox from './components/ChatBox';
import ChatInput from './components/ChatInput';
import './App.css';
import {translate, zeroShot} from "./services/LocalAIService";

interface Message {
  id: number;
  text: any;
  sender: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [useStream, setUseStream] = useState<boolean>(false); // State for "Use Stream" checkbox

  const addMessage = async (response: string | any, sender: string = 'User') => {
    if (typeof response === 'string') {
      const newMessage: Message = {
        id: Date.now(), // Use current timestamp for unique ID
        text: response,
        sender,
      };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    } else {
      const newMessage: Message = {
        id: Date.now(), // Use current timestamp for unique ID
        text: '',
        sender: 'Bot',
      };
      // debugger
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      for await (const text of response) {
        setMessages((prevMessages) => {
          const lastMessage: Message = prevMessages.pop() as Message;
          lastMessage.text = text;
          prevMessages.push(lastMessage)
          return [...prevMessages]
        });
      }
    }
  };

  const handleUserMessage = async (text: string, action: 'Prompt' | 'Translate') => {
    // Add user message to chat
    addMessage(text, 'User');
    debugger

    let response: string;

    switch (action) {
      case "Prompt":
        response = await zeroShot(text, useStream, "You are a stock broker");
        break;
      case "Translate":
        response = await translate(text);
        break;

    }

    // Call OpenAI API and get response

    if (response) {
      // Add OpenAI response to chat
      addMessage(response, 'Bot');
    }
  };

  return (
    <div className="app">
      <h1>AI Chat</h1>
      <label>
        <input
          type="checkbox"
          checked={useStream}
          onChange={(e) => setUseStream(e.target.checked)}
        />
        Use Stream
      </label>
      <ChatBox messages={messages}/>
      <ChatInput onSend={handleUserMessage}/>
    </div>
  );
};

export default App;
