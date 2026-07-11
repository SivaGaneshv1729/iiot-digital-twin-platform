import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Server, Settings, Bell, Search, Package, LogOut, ScanEye } from 'lucide-react';
import { FactoryAssistant } from './FactoryAssistant';
import './Layout.css';

export const Layout = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

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
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Search machines, orders..." className="search-input" />
          </div>
          <div className="header-actions">
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
    </div>
  );
};
