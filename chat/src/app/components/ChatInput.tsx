import React, {useState} from 'react';

interface ChatInputProps {
  onSend: (message: string, action: "Prompt" | "Translate") => void;
}

const ChatInput: React.FC<ChatInputProps> = ({onSend}) => {
  const [input, setInput] = useState<string>('');

  const handleSend = () => {
    if (input.trim()) {
      onSend(input, 'Prompt'); // Call the onSend function passed in props with the current input
      setInput('');  // Clear the input field after sending
    }
  };

  return (
    <div className="chat-input">
      <input
        type="text"
        placeholder="Type a message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};

export default ChatInput;
