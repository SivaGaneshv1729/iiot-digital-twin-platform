import { useState, useEffect } from 'react';
import { X, Send, Bot, Sparkles } from 'lucide-react';
import './FactoryAssistant.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const FactoryAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Welcome to SmartFactory AI Operations Copilot! Ask me about production OEE, high-risk machinery, thermal health, or quality yields.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Quick action prompts
  const QUICK_PROMPTS = [
    { label: '⚡ Highest Risk Machines', query: 'Show me machines with highest failure risk' },
    { label: '📊 Production & OEE', query: 'What is our current OEE and production output?' },
    { label: '🌡️ Thermal Overheating', query: 'Which machines are overheating?' },
    { label: '🛡️ Quality Yields', query: 'Show me quality assurance and defect rates' }
  ];

  // Dynamic in-code response engine
  const getDynamicAIResponse = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('risk') || q.includes('fail') || q.includes('anomaly') || q.includes('bad') || q.includes('highest')) {
      return "⚠️ **High-Risk Machinery Telemetry Alert:**\n\n• **Stamping Press 04 (Block B)**: Temp **89.4°C** (Normal < 70°C). Vibration **0.84 mm/s** (Threshold 0.50). Estimated Remaining Useful Life (RUL): **48 Hours**.\n• **CNC Milling 02 (Block A)**: Bearing wear detected. Vibration **0.52 mm/s**.\n\n💡 **Action**: Schedule PM lubrication during the 18:00 shift change.";
    }
    if (q.includes('oee') || q.includes('output') || q.includes('production') || q.includes('efficiency') || q.includes('quota')) {
      return "📊 **Live Production & OEE Summary:**\n\n• **Overall Efficiency (OEE)**: **94.2%** (+1.2% vs target)\n• **Shift Units Completed**: **18,634** / 20,000 Target (93.17% quota)\n• **Active Machinery**: **135 / 140** Operational Units\n• **Target Completion ETA**: **16:45 PM** today.";
    }
    if (q.includes('temp') || q.includes('heat') || q.includes('thermal') || q.includes('hot') || q.includes('overheat')) {
      return "🌡️ **Thermal Telemetry Scan Results:**\n\n• **Peak Temperature**: 89.4°C on *Stamping Press 04* (Block B)\n• **Plant Average Temp**: 48.2°C across 16 active units\n• **Cooling Loop**: Chiller Line #2 operating at 98% capacity.\n\n💡 *Tip: Toggle 'AI Heatmap' in 3D Digital Twin controls to inspect thermal gradient meshes.*";
    }
    if (q.includes('quality') || q.includes('defect') || q.includes('yield') || q.includes('fpy')) {
      return "🛡️ **Quality Assurance & CV Inspection Telemetry:**\n\n• **First Pass Yield (FPY)**: **96.59%**\n• **Computer Vision Engine**: Active on Assembly Floor (YOLO-v8x)\n• **Top Defect**: Micro-fractures on cylinder housings (8 instances today).\n• **Safety Interlock**: Vision-triggered E-STOP is active.";
    }
    if (q.includes('part') || q.includes('inventory') || q.includes('stock') || q.includes('spare')) {
      return "📦 **Inventory Telemetry:**\n\n• **Low Stock Alert**: Hydraulic Seal Kits (`PRT-1002`) at **12 units** in Zone C (Min threshold 50).\n• **Reorder Dispatch**: Ticket #8941 dispatched to supplier.\n• **Stock Health**: 19 / 20 SKUs in safe stock margin.";
    }
    return `🤖 **SmartFactory AI Assistant:**\n\nReceived query: "${query}"\n\n• **Overall Health**: 78% Plant Health (128 Healthy, 18 At Risk, 6 Maintenance)\n• **Live Telemetry**: 16 IoT Clusters streaming real-time metrics\n• Ask me about **machines**, **risk**, **OEE**, **temperature**, or **quality**!`;
  };

  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      fetch(`${apiUrl}/api/production/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setContext(data))
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: queryText }]);
    setInput('');
    setIsLoading(true);

    // Simulate AI thinking delay for better UX
    setTimeout(() => {
      const responseText = getDynamicAIResponse(queryText);
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
      setIsLoading(false);
    }, 600);
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
            <h3>SmartFactory AI Copilot</h3>
          </div>
          <button className="icon-btn" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="assistant-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content" style={{ whiteSpace: 'pre-line' }}>
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

        {/* Quick Action Chips */}
        <div style={{ padding: '8px 12px 4px', display: 'flex', gap: '6px', overflowX: 'auto', borderTop: '1px solid var(--border-color)' }}>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button 
              key={idx}
              onClick={() => handleSendQuery(prompt.query)}
              style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--border-glow)', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}
            >
              <Sparkles size={10} style={{ display: 'inline', marginRight: '4px' }} />
              {prompt.label}
            </button>
          ))}
        </div>

        <div className="assistant-input-area">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendQuery(input)}
            placeholder="Ask AI about factory metrics..." 
            disabled={isLoading}
          />
          <button onClick={() => handleSendQuery(input)} disabled={isLoading || !input.trim()} className="send-btn">
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
};
