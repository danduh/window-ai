import React, {useState} from 'react';
import {detectLanguage} from "../services/TranslateService";

interface ChatInputProps {
  onSend: (message: string, action: "Prompt" | "Translate") => void;
}

const ChatInput: React.FC<ChatInputProps> = ({onSend}) => {
  const [input, setInput] = useState<string>('');

  const translateSend = () => {
    if (input.trim()) {
      onSend(input, 'Translate'); // Call the onSend function passed in props with the current input
      setInput('');  // Clear the input field after sending
    }
  }

  const detectLng = () => {
    detectLanguage(input)
  }
  return (
    <div className="chat-input">
      <textarea
        placeholder="Type a message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && translateSend()}
      />
      <button onClick={translateSend}>Translate</button>
      <button onClick={detectLng}>Detect Language</button>
    </div>
  );
};

export default ChatInput;
