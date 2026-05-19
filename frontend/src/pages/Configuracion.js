import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

// ════════════════════════════════════════════════════════════════
// VIVO — Configuración (BYOK API Keys)
// ════════════════════════════════════════════════════════════════

const SECCIONES = [
  {
    titulo: '🧠 Claude (Anthropic) — Cerebro de los 12 agentes IA',
    color: '#FF6B35',
    keys: ['anthropic_api_key'],
  },
  {
    titulo: '📱 Twilio — WhatsApp del Vendedor IA',
    color: '#25D366',
    keys: ['twilio_account_sid', 'twilio_auth_token', 'twilio_whatsapp_from'],
  },
  {
    titulo: '📧 SendGrid — Email transaccional',
    color: '#3B82F6',
    keys: ['sendgrid_api_key', 'sendgrid_from_email', 'sendgrid_from_name'],
  },
  {
    titulo: '📄 Facturama — PAC para CFDI 4.0 + Carta Porte',
    color: '#16A34A',
    keys: ['facturama_username', 'facturama_password'],
  },
  {
    titulo: '🗺️ Mapbox — Geolocalización y rutas',
    color: '#0EA5E9',
    keys: ['mapbox_public_token'],
  },
];

export default function Configuracion() {
  const [claves, setClaves] = useState({});
  const [valores, setValores] = useState({});
  const [editando, setEditando] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.configApiKeys();
      setClaves(r);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (clave) => {
    const valor = valores[clave];
    if (!valor?.trim()) { setError('Valor vacío'); return; }
    setError(null); setMensaje(null);
    try {
      await api.configApiKeyGuardar(clave, valor.trim());
      setMensaje(`✅ ${clave} guardado`);
      setEditando({ ...editando, [clave]: false });
      setValores({ ...valores, [clave]: '' });
      await cargar();
      setTimeout(() => setMensaje(null), 3000);
    } catch (e) { setError(e.message); }
  };

  if (loading) return <div className="empty">Cargando configuración...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>⚙️ Configuración VIVO</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Conecta tus servicios externos (BYOK — Bring Your Own Keys). Las API keys quedan guardadas en tu base de datos, nunca en código.
          </p>
        </div>
      </div>

      {mensaje && <div className="alert green" style={{ marginBottom: 16 }}><div className="alert-dot"/><div>{mensaje}</div></div>}
      {error && <div className="alert red" style={{ marginBottom: 16 }}><div className="alert-dot"/><div>{error}</div></div>}

      {SECCIONES.map(s => (
        <div key={s.titulo} style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderLeft: `4px solid ${s.color}`,
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>{s.titulo}</h3>

          {s.keys.map(k => {
            const def = claves[k] || {};
            const configurado = def.configurado;
            return (
              <div key={k} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {configurado ? '✅' : '⚠️'} {def.label || k}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {def.descripcion}
                    </div>
                    {def.formato_esperado && (
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, fontFamily: 'monospace' }}>
                        Formato: {def.formato_esperado}
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 220 }}>
                    {editando[k] ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          type="text"
                          value={valores[k] || ''}
                          onChange={e => setValores({ ...valores, [k]: e.target.value })}
                          placeholder={def.formato_esperado || 'Pega tu key aquí'}
                          style={{ flex: 1 }}
                          autoFocus
                        />
                        <button onClick={() => guardar(k)} className="btn btn-primary btn-sm">Guardar</button>
                        <button onClick={() => { setEditando({ ...editando, [k]: false }); setValores({ ...valores, [k]: '' }); }} className="btn btn-ghost btn-sm">✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: configurado ? '#dcfce7' : '#fee2e2',
                          color: configurado ? '#166534' : '#991b1b',
                        }}>
                          {configurado ? `Configurado (${def.origen || 'bd'})` : 'No configurado'}
                        </span>
                        <button onClick={() => setEditando({ ...editando, [k]: true })} className="btn btn-ghost btn-sm">
                          {configurado ? 'Cambiar' : 'Configurar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div style={{
        background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
        color: '#fff',
        borderRadius: 12,
        padding: 20,
        marginTop: 24,
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>💡 ¿Por dónde empiezo?</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
          <strong style={{ color: '#FF6B35' }}>1. Anthropic (obligatorio)</strong> — sin esto los 12 agentes IA no responden. Consíguela en{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#FFB627' }}>console.anthropic.com</a>
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
          <strong style={{ color: '#FF6B35' }}>2. Twilio (recomendado)</strong> — el Vendedor IA usa WhatsApp para cerrar leads. Sandbox gratis para empezar.
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
          <strong style={{ color: '#FF6B35' }}>3. SendGrid (opcional)</strong> — email automático de cotizaciones y facturas. Free tier 100/día.
        </p>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
          <strong style={{ color: '#FF6B35' }}>4. Facturama + Mapbox</strong> — cuando estés listo para emitir CFDI reales y mostrar rutas en mapa.
        </p>
      </div>
    </div>
  );
}
