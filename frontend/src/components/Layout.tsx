import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Server, Settings, Bell, Search, Package, LogOut, ScanEye, Globe, ClipboardList, Cpu, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FactoryAssistant } from './FactoryAssistant';
import { CommandPalette } from './CommandPalette';
import { ReloadPrompt } from './ReloadPrompt';
import './Layout.css';

export const Layout = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ja' : 'en');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    window.addEventListener('cmd_toggle_theme', toggleTheme);
    return () => window.removeEventListener('cmd_toggle_theme', toggleTheme);
  }, []);

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <h2 className="brand-title">SmartFactory <span className="brand-accent">AI</span></h2>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/machines" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Server size={20} />
            <span>Machines</span>
          </NavLink>
          <NavLink to="/inventory" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Package size={20} />
            <span>Inventory</span>
          </NavLink>
          <NavLink to="/quality" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <ScanEye size={20} />
            <span>Quality Control</span>
          </NavLink>
          <NavLink to="/global" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Globe size={20} />
            <span>Global Network</span>
          </NavLink>

          <NavLink to="/audit" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <ClipboardList size={20} />
            <span>Audit Logs</span>
          </NavLink>
          <NavLink to="/mlops" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <Cpu size={20} />
            <span>MLOps Dashboard</span>
          </NavLink>
          <div className="nav-item disabled">
            <Settings size={20} />
            <span>Settings</span>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="top-header glass-panel">
          <div 
            className="search-bar" 
            onClick={() => window.dispatchEvent(new Event('open_command_palette'))}
            style={{ cursor: 'text' }}
          >
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search commands... (Press Ctrl+K)" className="search-input" readOnly style={{ cursor: 'text' }} />
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="icon-btn" onClick={toggleLanguage} title="Toggle Language">
              <Globe size={20} />
              <span style={{ marginLeft: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {i18n.language === 'en' ? 'EN' : 'JP'}
              </span>
            </button>
            <button className="icon-btn"><Bell size={20} /></button>
            <div className="user-avatar" title={user.username || 'User'}>
              {user.username ? user.username.substring(0, 2).toUpperCase() : 'AD'}
            </div>
            <button className="icon-btn" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      
      {/* AI Assistant */}
      <FactoryAssistant />
      
      {/* Omni-Search Command Palette */}
      <CommandPalette />
      
      {/* PWA Offline Prompt */}
      <ReloadPrompt />
    </div>
  );
};
