import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Machines } from './pages/Machines';
import { AuditLogs } from './pages/AuditLogs';
import { MLOps } from './pages/MLOps';
import { Security } from './pages/Security';
import { Login } from './pages/Login';
import { DemoSimulator } from './pages/DemoSimulator';

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
          <Route path="audit" element={<AuditLogs />} />
          <Route path="mlops" element={<MLOps />} />
          <Route path="security" element={<Security />} />
          <Route path="demo" element={<DemoSimulator />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
