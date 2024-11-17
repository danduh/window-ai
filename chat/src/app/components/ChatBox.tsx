import React from 'react';

export interface Message {
  id: number;
  text: string;
  sender: string;
}

interface ChatBoxProps {
  messages: Message[];
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages }) => {
  return (
    <div className="chat-box">
      {messages.map((message) => (
        <div key={message.id} className={`chat-message ${message.sender.toLowerCase()}`}>
          <strong>{message.sender}:</strong> {message.text}
        </div>
      ))}
    </div>
  );
};

export default ChatBox;
