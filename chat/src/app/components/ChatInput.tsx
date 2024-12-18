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
    <div className="chat-input flex space-x-2">
      <input
        type="text"
        placeholder="Type a message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSend}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200"
      >
        Send
      </button>
    </div>);
};

export default ChatInput;
