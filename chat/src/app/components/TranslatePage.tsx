import React, {useState} from 'react';
import ChatBox from './ChatBox';
import './ChatPage.css';
import TranslateInput from "./TranslateInput";
import {translate} from "../services/TranslateService";

interface Message {
  id: number;
  text: any;
  sender: string;
}

const ChatPage: React.FC = () => {
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
    addMessage(text, 'Origin');

    // Call AI API and get response
    const response = await translate(text);

    if (response) {
      // Add AI response to chat
      addMessage(response, 'Translation');
    }
  };

  return (
    <div className="app">
      <h1>AI Language detection and translation</h1>
      <label>
        <input
          type="checkbox"
          checked={useStream}
          onChange={(e) => setUseStream(e.target.checked)}
        />
        Use Stream
      </label>
      <ChatBox messages={messages}/>
      <TranslateInput onSend={handleUserMessage}/>
    </div>
  );
};

export default ChatPage;
