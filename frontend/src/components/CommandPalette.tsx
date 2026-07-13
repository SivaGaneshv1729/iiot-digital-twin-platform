import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, AlertOctagon, Sun, Server, Activity, Globe } from 'lucide-react';
import './CommandPalette.css';

interface Command {
  id: string;
  icon: any;
  title: string;
  subtitle?: string;
  action: () => void;
  section: string;
}

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const handleOpenCmd = () => setIsOpen(true);
    window.addEventListener('open_command_palette', handleOpenCmd);
    return () => window.removeEventListener('open_command_palette', handleOpenCmd);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Define commands
  const commands: Command[] = [
    { id: '1', icon: Server, title: 'Go to Machines', section: 'Navigation', action: () => { navigate('/machines'); setIsOpen(false); } },
    { id: '2', icon: Activity, title: 'Go to Dashboard', section: 'Navigation', action: () => { navigate('/'); setIsOpen(false); } },
    { id: '3', icon: Globe, title: 'Go to Global Network', section: 'Navigation', action: () => { navigate('/global'); setIsOpen(false); } },
    { id: '4', icon: FileText, title: 'Export PDF Report', section: 'Actions', action: () => { window.dispatchEvent(new CustomEvent('cmd_export_pdf')); setIsOpen(false); } },
    { id: '5', icon: AlertOctagon, title: 'Trigger Emergency Stop', subtitle: 'Jidoka / Halt all machines', section: 'Safety', action: () => { window.dispatchEvent(new CustomEvent('cmd_emergency_stop')); setIsOpen(false); } },
    { id: '6', icon: Sun, title: 'Toggle Theme', section: 'Settings', action: () => { window.dispatchEvent(new CustomEvent('cmd_toggle_theme')); setIsOpen(false); } },
  ];

  const filteredCommands = query 
    ? commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.subtitle?.toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-palette glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-wrapper">
          <Search size={20} className="command-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="command-badge">ESC</div>
        </div>
        <div className="command-results">
          {filteredCommands.length === 0 && <div className="no-results">No results found.</div>}
          {filteredCommands.map((cmd, index) => {
            const Icon = cmd.icon;
            return (
              <div 
                key={cmd.id} 
                className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => cmd.action()}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-item-left">
                  <Icon size={16} />
                  <span className="command-title">{cmd.title}</span>
                </div>
                {cmd.subtitle && <span className="command-subtitle">{cmd.subtitle}</span>}
                <span className="command-section">{cmd.section}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
