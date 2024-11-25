import React, {useState} from 'react';
import ChatBox from './ChatBox';
import ChatInput from './ChatInput';
import {zeroShot} from '../services/ChatAIService';
import {DocsRenderer} from "../tools/DocsRenderer";

interface Message {
  id: number;
  text: any;
  sender: string;
}

const ChatPage: React.FC = () => {
  const [systemMsg, setSystemMsg] = useState<string>();
  const [destroy, setDestroy] = useState<boolean>(false);
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

  const handleUserMessage = async (text: string) => {
    // Add user message to chat
    addMessage(text, 'User');

    // Call AI API and get response
    const response = await zeroShot(text, useStream, systemMsg, destroy);


    if (response) {
      // Add AI response to chat
      addMessage(response, 'Bot');
    }
  };

  return (
    <div className="app">
      <h1>AI Chat</h1>
      <fieldset className="chat">
        <div>
          <label htmlFor="stream">
            Use Stream:
          </label>
          <input
            id="stream"
            type="checkbox"
            checked={useStream}
            onChange={(e) => setUseStream(e.target.checked)}
          />
        </div>
        <div>
          <label htmlFor="destroy">
            Destroy Chat Session:
          </label>
          <input
            id="destroy"
            type="checkbox"
            checked={destroy}
            onChange={(e) => setDestroy(e.target.checked)}
          />
        </div>
        <div>
          <label htmlFor="systemMsg">
            Add System Message
          </label>
          <input id="systemMsg" type="text"
                 onChange={(e) => setSystemMsg(e.target.value)}/>
        </div>
      </fieldset>
      <ChatBox messages={messages}/>
      <ChatInput onSend={handleUserMessage}/>
      <DocsRenderer docFile="Chat-API.md"></DocsRenderer>
    </div>
  );
};

export default ChatPage;
