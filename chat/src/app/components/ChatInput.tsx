import React, {useState} from 'react';

interface ChatInputProps {
  onSend: (message: string, action: "Prompt" | "Translate") => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({onSend, disabled = false}) => {
  const [input, setInput] = useState<string>('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input, 'Prompt');
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-200">
      <div className="flex space-x-3">
        <div className="flex-1 relative">
          <textarea
            placeholder="Type your message... (Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            rows={1}
            className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              minHeight: '44px',
              maxHeight: '120px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500 flex items-center justify-center min-w-[80px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
