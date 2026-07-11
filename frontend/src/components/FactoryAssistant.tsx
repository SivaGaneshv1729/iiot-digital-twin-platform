import { useState, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
import './FactoryAssistant.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const FactoryAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am the SmartFactory AI. Ask me about production status or machine health.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState({});

  // Fetch factory context to send to LLM
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('token');
      fetch('http://localhost:4000/api/production/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setContext(data))
        .catch(console.error);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: userMessage,
          context: context
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || data.error }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not connect to the AI service.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        className={`assistant-fab ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <Bot size={24} />
      </button>

      {/* Chat Window */}
      <div className={`assistant-window glass-panel ${isOpen ? 'open' : ''}`}>
        <div className="assistant-header">
          <div className="assistant-title">
            <Bot size={20} className="text-accent" />
            <h3>Factory Assistant</h3>
          </div>
          <button className="icon-btn" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="assistant-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <div className="message-content typing-indicator">
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          )}
        </div>

        <div className="assistant-input-area">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about factory data..." 
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className="send-btn">
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
};
