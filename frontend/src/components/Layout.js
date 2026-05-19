import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ════════════════════════════════════════════════════════════════
// VIVO — Layout principal
// Brokerage de Urgencias Logísticas. Tu carga, VIVO.
// ════════════════════════════════════════════════════════════════

const NAV = [
  // ── Operativo ─────────────────────────────────────
  { to: '/',              label: 'Dashboard',     icon: '📊', roles: ['director','admin','caja','logistica','monitoreo'] },
  { to: '/agentes',       label: 'Agentes IA',    icon: '🤖', roles: ['director','admin','caja','logistica'] },
  { to: '/cotizar-interno', label: 'Cotizar',     icon: '⚡', roles: ['director','admin','caja','logistica'] },

  // ── Pipeline comercial ────────────────────────────
  { to: '/leads',         label: 'Leads',         icon: '🎯', roles: ['director','admin','caja','logistica'] },
  { to: '/clientes',      label: 'Clientes',      icon: '👥', roles: ['director','admin','caja'] },
  { to: '/vendedor-ia',   label: 'Vendedor IA',   icon: '💬', roles: ['director','admin','caja'] },

  // ── Red broker ────────────────────────────────────
  { to: '/broker',        label: 'Red Transportistas', icon: '🤝', roles: ['director','admin','logistica'] },
  { to: '/asignador',     label: 'Asignador IA',  icon: '🎯', roles: ['director','admin','logistica'] },

  // ── Finanzas ──────────────────────────────────────
  { to: '/broker-finanzas', label: 'Cashflow',    icon: '💸', roles: ['director','admin','caja'] },
  { to: '/fiscal',          label: 'Facturación SAT', icon: '📄', roles: ['director','admin','caja'] },

  // ── Growth ────────────────────────────────────────
  { to: '/atraccion',     label: 'Atracción IA',  icon: '🚀', roles: ['director','admin'] },
  { to: '/retencion',     label: 'Retención IA',  icon: '🔄', roles: ['director','admin','caja'] },

  // ── Estratégico ────────────────────────────────────
  { to: '/auditor',       label: 'Auditor IA',    icon: '🔍', roles: ['director'] },

  // ── Configuración ─────────────────────────────────
  { to: '/configuracion', label: 'Configuración', icon: '⚙️', roles: ['director','admin'] },
];

const ROLES = {
  director: 'CEO / Fundador',
  admin: 'Administrador',
  caja: 'Operaciones',
  logistica: 'Coordinador',
  monitoreo: 'Monitor',
};

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      <div className={`overlay ${open?'show':''}`} onClick={() => setOpen(false)} />
      <div className={`sidebar ${open?'open':''}`}>
        <div className="sidebar-logo">
          <h1>VIVO</h1>
          <span>Brokerage de Urgencias</span>
          <div className="eslogan">Tu carga, VIVO.</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.filter(n => n.roles.includes(usuario?.rol)).map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/'}
              className={({isActive}) => `nav-item ${isActive?'active':''}`}
              onClick={() => setOpen(false)}>
              <span className="icon">{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-name">{usuario?.nombre}</div>
          <div className="sidebar-user-rol">{ROLES[usuario?.rol]}</div>
          <div className="sidebar-user-logout" onClick={handleLogout}>Cerrar sesión →</div>
        </div>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setOpen(!open)}>☰</button>
          <span style={{ fontWeight: 900, color: '#FF6B35', letterSpacing: '0.05em', fontSize: 18 }}>VIVO</span>
          <span style={{ fontSize:12, opacity:.7 }}>{usuario?.nombre}</span>
        </div>
        <div className="main-content"><Outlet /></div>
      </div>
    </div>
  );
}
