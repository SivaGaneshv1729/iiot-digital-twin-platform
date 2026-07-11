import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Machines } from './pages/Machines';
import { Inventory } from './pages/Inventory';
import { Quality } from './pages/Quality';
import { AuditLogs } from './pages/AuditLogs';
import { Login } from './pages/Login';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="machines" element={<Machines />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="quality" element={<Quality />} />
          <Route path="audit" element={<AuditLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
