import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Páginas core
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CotizadorPublico from './pages/CotizadorPublico';

// Agentes IA
import AgentesIA from './pages/AgentesIA';
import VendedorIA from './pages/VendedorIA';
import AsignadorIA from './pages/AsignadorIA';
import RetencionIA from './pages/RetencionIA';
import AtraccionIA from './pages/AtraccionIA';
import AuditorIA from './pages/AuditorIA';

// Operativo
import Leads from './pages/Leads';
import Broker from './pages/Broker';
import Fiscal from './pages/Fiscal';
import Configuracion from './pages/Configuracion';

// ════════════════════════════════════════════════════════════════
// VIVO — Tu carga, VIVO.
// Brokerage de urgencias logísticas con 12 agentes IA.
// ════════════════════════════════════════════════════════════════

const PrivateRoute = ({ children, roles }) => {
  const { usuario, loading } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  if (!usuario) return <Navigate to="/login" />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/cotizar" element={<CotizadorPublico />} />

          {/* Rutas privadas con layout */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />

            {/* Hub de agentes IA */}
            <Route path="agentes" element={<PrivateRoute roles={['director','admin','caja','logistica']}><AgentesIA /></PrivateRoute>} />
            <Route path="agentes/:nombre" element={<PrivateRoute roles={['director','admin','caja','logistica']}><AgentesIA /></PrivateRoute>} />

            {/* Pipeline comercial */}
            <Route path="leads" element={<PrivateRoute roles={['director','admin','caja','logistica']}><Leads /></PrivateRoute>} />
            <Route path="vendedor-ia" element={<PrivateRoute roles={['director','admin','caja']}><VendedorIA /></PrivateRoute>} />

            {/* Red broker */}
            <Route path="broker" element={<PrivateRoute roles={['director','admin','logistica']}><Broker /></PrivateRoute>} />
            <Route path="asignador" element={<PrivateRoute roles={['director','admin','logistica']}><AsignadorIA /></PrivateRoute>} />

            {/* Finanzas */}
            <Route path="fiscal" element={<PrivateRoute roles={['director','admin','caja']}><Fiscal /></PrivateRoute>} />

            {/* Growth */}
            <Route path="atraccion" element={<PrivateRoute roles={['director','admin']}><AtraccionIA /></PrivateRoute>} />
            <Route path="retencion" element={<PrivateRoute roles={['director','admin','caja']}><RetencionIA /></PrivateRoute>} />

            {/* Estratégico */}
            <Route path="auditor" element={<PrivateRoute roles={['director']}><AuditorIA /></PrivateRoute>} />

            {/* Configuración */}
            <Route path="configuracion" element={<PrivateRoute roles={['director','admin']}><Configuracion /></PrivateRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
