import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const fmt$ = n => '$' + Math.round(parseFloat(n) || 0).toLocaleString('es-MX');

export default function Dashboard() {
  const { usuario } = useAuth();
  const [data, setData] = useState(null);
  const [auditor, setAuditor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.brokerDashboard().catch(() => ({ stats: {}, alertas: [] })),
      api.auditorDashboard().catch(() => null),
    ]).then(([broker, aud]) => {
      setData(broker);
      setAuditor(aud);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="empty">Cargando dashboard VIVO...</div>;

  const exp = data?.exposicion || {};
  const stats = data?.pagos_vencidos || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>👋 Hola, {usuario?.nombre?.split(' ')[0]}</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Bienvenido a VIVO. Tu carga, VIVO.
          </p>
        </div>
      </div>

      {/* Hero card con resumen ejecutivo del Auditor IA si hay */}
      {auditor?.ultima_ejecucion ? (
        <div style={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #E55822 100%)',
          color: '#fff',
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
          boxShadow: '0 10px 30px rgba(255,107,53,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                🔍 Auditor IA · {auditor.ultima_ejecucion.semana_iso}
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
                {auditor.ultima_ejecucion.resumen_ejecutivo || 'Sin resumen ejecutivo.'}
              </p>
            </div>
            <div style={{ textAlign: 'right', minWidth: 140 }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Hallazgos</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{auditor.stats?.abiertos || 0}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>abiertos</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
          color: '#fff',
          borderRadius: 14,
          padding: 28,
          marginBottom: 20,
          textAlign: 'center',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 48,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.05em',
          }}>VIVO</h1>
          <p style={{ margin: '8px 0 0', fontSize: 16, color: '#FF6B35', fontStyle: 'italic', fontWeight: 600 }}>
            Tu carga, VIVO.
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 13, opacity: 0.8 }}>
            12 agentes IA listos. Brokerage de urgencias 24/7. Configura tus API keys para empezar.
          </p>
        </div>
      )}

      {/* KPIs operativos */}
      <div className="metric-grid" style={{ marginBottom: 24 }}>
        <Metric label="💰 Te falta cobrar" value={fmt$(exp.pendiente_cobrar_cliente)} color="#16a34a" />
        <Metric label="📤 Debes pagar transportistas" value={fmt$(exp.pendiente_pagar_transportista)} color="#FF6B35" />
        <Metric label="⚠️ Exposición neta" value={fmt$(Math.abs(exp.exposicion_neta || 0))} color={exp.exposicion_neta > 0 ? '#991b1b' : '#16a34a'} />
        <Metric label="🚛 Operaciones activas" value={exp.operaciones_activas || 0} color="#1B3A6B" />
      </div>

      {/* Accesos rápidos a agentes IA */}
      <h3 style={{ margin: '24px 0 12px', fontSize: 18 }}>🤖 Tus 12 agentes IA</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { n: 'ceo', e: '👑', l: 'CEO IA', d: 'Estratega' },
          { n: 'vendedor', e: '🤖', l: 'Vendedor 24/7', d: 'Cierre auto' },
          { n: 'negociador', e: '🤝', l: 'Negociador', d: 'Regateo' },
          { n: 'asignador', e: '🎯', l: 'Asignador', d: 'Match' },
          { n: 'cfo', e: '💸', l: 'CFO', d: 'Cashflow' },
          { n: 'abogado', e: '⚖️', l: 'Abogado', d: 'Legal' },
          { n: 'contador', e: '📊', l: 'Contador', d: 'SAT' },
          { n: 'reclutador', e: '🔍', l: 'Reclutador', d: 'Onboarding' },
          { n: 'atraccion', e: '🚀', l: 'Atracción', d: 'Marketing' },
          { n: 'retencion', e: '🔄', l: 'Retención', d: 'Lifetime' },
          { n: 'disputas', e: '🚨', l: 'Disputas', d: 'Quejas' },
          { n: 'reputacion', e: '📡', l: 'Reputación', d: 'Brand' },
        ].map(a => (
          <a key={a.n} href={`/agentes/${a.n}`} style={{
            display: 'block',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: 14,
            textAlign: 'center',
            textDecoration: 'none',
            color: '#1a1a1a',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: 28 }}>{a.e}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{a.l}</div>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{a.d}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
    </div>
  );
}
