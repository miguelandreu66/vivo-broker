import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

// ════════════════════════════════════════════════════════════════
// VIVO — Costos IA
// Muestra cuánto gastas en cada agente Claude (Opus/Sonnet/Haiku)
// ════════════════════════════════════════════════════════════════

const PERIODOS = [
  { label: '7 días',  dias: 7 },
  { label: '30 días', dias: 30 },
  { label: '90 días', dias: 90 },
];

const COLORES_MODELO = {
  'claude-opus-4-7':   { bg: '#7c3aed20', border: '#7c3aed', label: 'Opus 4.7'   },
  'claude-opus-4-6':   { bg: '#7c3aed20', border: '#7c3aed', label: 'Opus 4.6'   },
  'claude-sonnet-4-6': { bg: '#3b82f620', border: '#3b82f6', label: 'Sonnet 4.6' },
  'claude-sonnet-4-5': { bg: '#3b82f620', border: '#3b82f6', label: 'Sonnet 4.5' },
  'claude-haiku-4-5':  { bg: '#16a34a20', border: '#16a34a', label: 'Haiku 4.5'  },
};

export default function CostosIA() {
  const toast = useToast();
  const [dias, setDias] = useState(30);
  const [costos, setCostos] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar(dias);
  }, [dias]);

  async function cargar() {
    try {
      setLoading(true);
      const [c, h] = await Promise.all([
        api.agentesCostos(dias).catch(() => ({ por_agente: [], totales: {} })),
        api.agentesHistorial(`?limite=25`).catch(() => ({ invocaciones: [] })),
      ]);
      setCostos(c);
      setHistorial(h.invocaciones || h || []);
    } catch (e) {
      toast.error('No se pudieron cargar los costos: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const totales = useMemo(() => {
    if (!costos) return null;
    const t = costos.totales || {};
    return {
      total_usd:     Number(t.total_usd ?? 0),
      total_mxn:     Number(t.total_usd ?? 0) * 17.5, // tipo cambio aprox
      invocaciones:  Number(t.invocaciones ?? 0),
      tokens_input:  Number(t.tokens_input ?? 0),
      tokens_output: Number(t.tokens_output ?? 0),
      cache_read:    Number(t.cache_read ?? 0),
      cache_write:   Number(t.cache_write ?? 0),
    };
  }, [costos]);

  const porAgente = costos?.por_agente || [];

  return (
    <div style={{ padding: 24, color: '#fff', minHeight: '100vh', background: '#0A0A0A' }}>
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
          }}>💸 Costos IA</h1>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: 13 }}>
            Cuánto gastan tus 12 agentes Claude en los últimos {dias} días
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

      {loading && <div style={{ color: '#9ca3af' }}>Cargando costos...</div>}

      {!loading && totales && (
        <>
          {/* Tarjetas de resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <ResumenCard titulo="Total USD"          valor={`$${totales.total_usd.toFixed(2)}`}   acento="#FF6B35" />
            <ResumenCard titulo="Total MXN (≈)"      valor={`$${totales.total_mxn.toFixed(0)}`}    acento="#FFB627" />
            <ResumenCard titulo="Invocaciones"       valor={totales.invocaciones.toLocaleString()} acento="#3b82f6" />
            <ResumenCard titulo="Tokens input"       valor={formatNum(totales.tokens_input)}       acento="#16a34a" />
            <ResumenCard titulo="Tokens output"      valor={formatNum(totales.tokens_output)}      acento="#16a34a" />
            <ResumenCard titulo="Cache hits"         valor={formatNum(totales.cache_read)}         acento="#9333ea"
              tooltip="Tokens leídos de cache (90% más baratos)" />
          </div>

          {/* Tabla por agente */}
          <Card titulo="Gasto por agente">
            {porAgente.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>
                Aún no hay invocaciones registradas en este periodo.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                      <Th>Agente</Th>
                      <Th>Modelo</Th>
                      <Th>Invocaciones</Th>
                      <Th>Tokens input</Th>
                      <Th>Tokens output</Th>
                      <Th>Costo USD</Th>
                      <Th>% del total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {porAgente.map((a, i) => {
                      const pct = totales.total_usd > 0 ? (Number(a.total_usd || 0) / totales.total_usd) * 100 : 0;
                      const color = COLORES_MODELO[a.modelo] || { bg: '#37415120', border: '#374151', label: a.modelo };
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                          <Td><strong>{a.agente}</strong></Td>
                          <Td>
                            <span style={{
                              background: color.bg,
                              border: `1px solid ${color.border}`,
                              borderRadius: 6,
                              padding: '2px 8px',
                              fontSize: 11,
                              color: color.border,
                            }}>{color.label}</span>
                          </Td>
                          <Td>{Number(a.invocaciones || 0).toLocaleString()}</Td>
                          <Td>{formatNum(a.tokens_input || 0)}</Td>
                          <Td>{formatNum(a.tokens_output || 0)}</Td>
                          <Td><strong style={{ color: '#FFB627' }}>${Number(a.total_usd || 0).toFixed(4)}</strong></Td>
                          <Td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{
                                width: 60, height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden',
                              }}>
                                <div style={{
                                  width: `${pct}%`, height: '100%',
                                  background: 'linear-gradient(90deg, #FF6B35, #FFB627)',
                                }} />
                              </div>
                              <span style={{ fontSize: 11, color: '#9ca3af' }}>{pct.toFixed(1)}%</span>
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Últimas invocaciones */}
          <Card titulo="Últimas 25 invocaciones">
            {historial.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin invocaciones recientes.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #374151', textAlign: 'left' }}>
                      <Th>Fecha</Th>
                      <Th>Agente</Th>
                      <Th>Modelo</Th>
                      <Th>Tokens</Th>
                      <Th>Costo</Th>
                      <Th>Latencia</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                        <Td>{h.creado_en ? new Date(h.creado_en).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</Td>
                        <Td>{h.agente_nombre || h.agente || '—'}</Td>
                        <Td><small style={{ color: '#9ca3af' }}>{h.modelo || '—'}</small></Td>
                        <Td>{formatNum(h.tokens_input || 0)} → {formatNum(h.tokens_output || 0)}</Td>
                        <Td style={{ color: '#FFB627' }}>${Number(h.costo_usd || 0).toFixed(4)}</Td>
                        <Td>{h.latencia_ms ? `${h.latencia_ms}ms` : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Tips para optimizar */}
          <div style={{
            background: 'rgba(255,107,53,0.08)',
            border: '1px solid #FF6B35',
            borderRadius: 12,
            padding: 16,
            marginTop: 20,
            fontSize: 13,
          }}>
            <strong style={{ color: '#FF6B35' }}>💡 Cómo bajar tus costos</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 22, color: '#d1d5db', lineHeight: 1.7 }}>
              <li>Si un agente usa <strong>Opus 4.7</strong> en tareas simples, bájalo a <strong>Sonnet 4.6</strong> en su configuración.</li>
              <li>Las invocaciones con <strong>cache hit alto</strong> son 90% más baratas — prompts repetidos son tus mejores amigos.</li>
              <li>El <strong>Auditor IA semanal</strong> es el agente más caro por tener prompt largo; deja su frecuencia en semanal, no diaria.</li>
              <li>Si el gasto pasa de USD 50/mes, considera activar <strong>Haiku 4.5</strong> para los agentes de clasificación.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function ResumenCard({ titulo, valor, acento, tooltip }) {
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

function formatNum(n) {
  const num = Number(n || 0);
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
  return num.toString();
}
