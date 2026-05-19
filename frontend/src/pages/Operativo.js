import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, FunnelChart, Funnel, LabelList, Cell,
} from 'recharts';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

// ════════════════════════════════════════════════════════════════
// VIVO — Página /operativo
// Stats reales del negocio: leads/día, conversión por tier,
// tiempo de asignación, top transportistas, funnel, GMV
// ════════════════════════════════════════════════════════════════

const PERIODOS = [
  { label: '7 días',  dias: 7 },
  { label: '30 días', dias: 30 },
  { label: '90 días', dias: 90 },
];

const TIER_COLOR = {
  critical: '#DC2626',
  express:  '#FF6B35',
  urgent:   '#FFB627',
  standard: '#3B82F6',
};

export default function Operativo() {
  const toast = useToast();
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar(dias);
  }, [dias]);

  async function cargar(d) {
    try {
      setLoading(true);
      const result = await api.operativoStats(d);
      setData(result);
    } catch (e) {
      toast.error('No se pudo cargar el dashboard operativo: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const kpis = data?.kpis;
  const conversionGlobal = useMemo(() => {
    if (!kpis || !kpis.leads_total) return 0;
    return (kpis.leads_ganados / kpis.leads_total) * 100;
  }, [kpis]);

  return (
    <div style={{ padding: 24, color: '#fff', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 28,
            background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 800,
          }}>📊 Operativo</h1>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: 13 }}>
            Estado del negocio en los últimos {dias} días
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODOS.map(p => (
            <button key={p.dias} onClick={() => setDias(p.dias)}
              style={{
                padding: '8px 14px',
                background: dias === p.dias ? 'linear-gradient(135deg, #FF6B35 0%, #E55822 100%)' : 'transparent',
                color: '#fff',
                border: `1px solid ${dias === p.dias ? '#FF6B35' : '#374151'}`,
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13,
              }}>{p.label}</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ color: '#9ca3af' }}>Cargando stats...</div>}

      {!loading && !data && (
        <div style={{ background: '#0F0F0F', border: '1px solid #1f2937', borderRadius: 12, padding: 32, textAlign: 'center', color: '#9ca3af' }}>
          Sin datos para mostrar.
        </div>
      )}

      {!loading && data && (
        <>
          {/* ─── KPIs ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <KpiCard titulo="Leads totales"      valor={kpis.leads_total.toLocaleString()}       acento="#3B82F6" />
            <KpiCard titulo="Ganados"            valor={kpis.leads_ganados.toLocaleString()}     acento="#16A34A" />
            <KpiCard titulo="Conversión global"  valor={`${conversionGlobal.toFixed(1)}%`}       acento="#FF6B35" />
            <KpiCard titulo="GMV (MXN)"          valor={`$${formatMoney(kpis.gmv_total)}`}       acento="#FFB627" />
            <KpiCard titulo="Ticket promedio"    valor={`$${formatMoney(kpis.ticket_promedio)}`} acento="#9333EA" />
            <KpiCard titulo="Asignación (hr)"    valor={kpis.horas_promedio_asignacion.toFixed(1)} acento="#DC2626"
              tooltip="Promedio de horas entre lead creado y transportista asignado" />
          </div>

          {/* ─── Serie diaria de leads ─── */}
          <Card titulo="📈 Leads por día (ganados vs. total)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.serie_diaria}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="fecha" stroke="#9ca3af" fontSize={11}
                  tickFormatter={(v) => v ? v.slice(5) : ''} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #374151', borderRadius: 8, color: '#fff' }}
                  labelStyle={{ color: '#FFB627' }} />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Line type="monotone" dataKey="leads"   stroke="#3B82F6" strokeWidth={2} dot={false} name="Leads totales" />
                <Line type="monotone" dataKey="ganados" stroke="#16A34A" strokeWidth={2} dot={false} name="Ganados" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Grid de 2 columnas: tier + funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, marginBottom: 16 }}>

            {/* ─── Conversión por tier ─── */}
            <Card titulo="🎯 Conversión por tier de urgencia">
              {data.por_tier.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos en este periodo.</p>
              ) : (
                <div>
                  {data.por_tier.map(t => (
                    <div key={t.tier} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: TIER_COLOR[t.tier] || '#fff' }}>
                          {t.tier?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>
                          {t.ganados}/{t.total} · <strong style={{ color: TIER_COLOR[t.tier] || '#fff' }}>{t.conversion_pct.toFixed(1)}%</strong>
                        </span>
                      </div>
                      <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(t.conversion_pct, 100)}%`,
                          height: '100%',
                          background: TIER_COLOR[t.tier] || '#3B82F6',
                          transition: 'width 0.4s',
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                        Ticket promedio: ${formatMoney(t.ticket_promedio)} MXN
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* ─── Funnel ─── */}
            <Card titulo="🪜 Funnel de conversión">
              <ResponsiveContainer width="100%" height={260}>
                <FunnelChart>
                  <Tooltip contentStyle={{ background: '#0A0A0A', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} />
                  <Funnel
                    dataKey="value"
                    data={[
                      { name: 'Visitas',      value: data.funnel.visitas || 1,      fill: '#3B82F6' },
                      { name: 'Cotizaciones', value: data.funnel.cotizaciones || 1, fill: '#9333EA' },
                      { name: 'Leads',        value: data.funnel.leads || 1,        fill: '#FF6B35' },
                      { name: 'Ganados',      value: data.funnel.ganados || 1,      fill: '#16A34A' },
                    ]}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
                Visita → Cotización → Lead → Ganado
              </div>
            </Card>
          </div>

          {/* ─── Top transportistas ─── */}
          <Card titulo="🚛 Top 5 transportistas del periodo">
            {data.top_transportistas.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>
                Aún no hay transportistas con asignaciones en este periodo.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                      <Th>#</Th>
                      <Th>Transportista</Th>
                      <Th>Score</Th>
                      <Th>Asignados</Th>
                      <Th>Ganados</Th>
                      <Th>Tasa</Th>
                      <Th>Comisiones MXN</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_transportistas.map((t, i) => {
                      const tasa = t.leads_asignados > 0 ? (t.leads_ganados / t.leads_asignados) * 100 : 0;
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #1f2937' }}>
                          <Td><strong style={{ color: '#FFB627' }}>{i + 1}</strong></Td>
                          <Td><strong>{t.razon_social}</strong></Td>
                          <Td>
                            <span style={{ color: t.score >= 4 ? '#16A34A' : t.score >= 3 ? '#FFB627' : '#9ca3af' }}>
                              {t.score?.toFixed(1) || '—'} ⭐
                            </span>
                          </Td>
                          <Td>{t.leads_asignados}</Td>
                          <Td>{t.leads_ganados}</Td>
                          <Td>
                            <span style={{ color: tasa >= 70 ? '#16A34A' : tasa >= 40 ? '#FFB627' : '#DC2626' }}>
                              {tasa.toFixed(0)}%
                            </span>
                          </Td>
                          <Td><strong style={{ color: '#FFB627' }}>${formatMoney(t.comisiones)}</strong></Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ─── Tip box ─── */}
          <div style={{
            background: 'rgba(255,107,53,0.08)',
            border: '1px solid #FF6B35',
            borderRadius: 12,
            padding: 16,
            marginTop: 20,
            fontSize: 13,
          }}>
            <strong style={{ color: '#FF6B35' }}>💡 Cómo interpretar esta página</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 22, color: '#d1d5db', lineHeight: 1.7 }}>
              <li><strong>Conversión global &lt; 15%</strong> = embudo roto. Revisa el seguimiento de Vendedor IA.</li>
              <li><strong>Asignación &gt; 2 hrs en tier CRITICAL</strong> = SLA en riesgo. Activa el Asignador IA en automático.</li>
              <li><strong>Funnel Visitas → Leads &lt; 5%</strong> = problema en el cotizador público o la landing.</li>
              <li><strong>Top transportista con tasa &lt; 40%</strong> = mucho lead asignado, poco ganado. Revisa si está sobrecargado.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────

function KpiCard({ titulo, valor, acento, tooltip }) {
  return (
    <div title={tooltip} style={{
      background: '#0F0F0F',
      border: `1px solid ${acento}40`,
      borderRadius: 10,
      padding: 14,
      borderLeft: `4px solid ${acento}`,
    }}>
      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{titulo}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#fff' }}>{valor}</div>
    </div>
  );
}

function Card({ titulo, children }) {
  return (
    <div style={{
      background: '#0F0F0F',
      border: '1px solid #1f2937',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 15, color: '#FFB627' }}>{titulo}</h2>
      {children}
    </div>
  );
}

const Th = ({ children }) => <th style={{ padding: '8px 6px', fontWeight: 600, color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>{children}</th>;
const Td = ({ children, style }) => <td style={{ padding: '10px 6px', verticalAlign: 'middle', ...style }}>{children}</td>;

function formatMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString('es-MX', { maximumFractionDigits: 0 });
}
