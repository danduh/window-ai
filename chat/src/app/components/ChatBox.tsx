import React, {useEffect, useState} from 'react';
import Markdown from "react-markdown";

export interface Message {
  id: number;
  text: string;
  sender: string;
}

interface ChatBoxProps {
  messages: Message[];
}

const ChatBox: React.FC<ChatBoxProps> = ({messages}) => {
  const [initializedMessages, setInitializedMessages] = useState<Message[]>([]);
  useEffect(() => {
    if (messages) {
      setInitializedMessages(messages);
    }
  }, [messages]);

  return (
    <div className="chat-box bg-white rounded-lg shadow-md p-4 h-96 overflow-y-auto mb-4">
      {initializedMessages.map((message) => (
        <div
          key={message.id}
          className={`chat-message mb-4 p-3 rounded-lg ${
            message.sender.toLowerCase() === 'user'
              ? 'bg-blue-100 text-blue-800 ml-auto'
              : 'bg-gray-100 text-gray-800'
          } max-w-[80%] break-words`}>
          <strong className="font-semibold">{message.sender}:</strong>
          <Markdown>{message.text}</Markdown>
        </div>
      ))}
    </div>
  );
};

export default ChatBox;
