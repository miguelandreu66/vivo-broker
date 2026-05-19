import React, { useState } from 'react';
import { api } from '../api';

// Cotizador interno para que la administradora cotice
// cuando un cliente llama por teléfono.

const fmt$ = n => '$' + Math.round(parseFloat(n) || 0).toLocaleString('es-MX');

const TIPOS_CARGA = ['general','fragil','refrigerada','peligrosa','liquidos','otro'];

const TIERS = [
  { codigo: 'CRITICAL', label: '🚨 Critical (3x)', color: '#DC2626' },
  { codigo: 'EXPRESS',  label: '⚡ Express (2x)',  color: '#F59E0B' },
  { codigo: 'URGENT',   label: '🔥 Urgent (1.5x)', color: '#3B82F6' },
];

export default function CotizarInterno() {
  const [form, setForm] = useState({
    contacto_nombre: '', empresa: '', email: '', telefono: '',
    origen: '', destino: '',
    toneladas: '', tipo_carga: 'general',
    tier_codigo: 'EXPRESS',
    anexos_codigos: [],
    comentarios: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const cotizar = async (e) => {
    e.preventDefault();
    if (!form.contacto_nombre || !form.origen || !form.destino) {
      setError('Nombre, origen y destino son obligatorios');
      return;
    }
    setEnviando(true); setError(null);
    try {
      const body = { ...form, toneladas: form.toneladas ? parseFloat(form.toneladas) : null };
      const r = await api.leadCotizarPublico(body);
      setResultado(r);
    } catch (e) { setError(e.message); }
    finally { setEnviando(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>⚡ Cotizar (Admin)</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Para cotizar a un cliente que llama por teléfono. Crea lead automáticamente.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        <form onSubmit={cotizar} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Datos del cliente</h3>

          {error && <div className="alert red" style={{ marginBottom: 12 }}><div className="alert-dot"/><div>{error}</div></div>}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input type="text" value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              <input type="text" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </div>
          </div>

          <h3 style={{ margin: '14px 0 10px', fontSize: 16 }}>Viaje</h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Origen *</label>
              <input type="text" value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })} placeholder="Cuernavaca, Mor" />
            </div>
            <div className="form-group">
              <label className="form-label">Destino *</label>
              <input type="text" value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} placeholder="CDMX" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Toneladas</label>
              <input type="number" step="0.1" value={form.toneladas} onChange={e => setForm({ ...form, toneladas: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de carga</label>
              <select value={form.tipo_carga} onChange={e => setForm({ ...form, tipo_carga: e.target.value })}>
                {TIPOS_CARGA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tier de urgencia</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {TIERS.map(t => (
                <button key={t.codigo} type="button" onClick={() => setForm({ ...form, tier_codigo: t.codigo })}
                  style={{
                    padding: '10px 6px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: '2px solid ' + (form.tier_codigo === t.codigo ? t.color : '#e5e7eb'),
                    background: form.tier_codigo === t.codigo ? t.color + '15' : '#fff',
                    color: form.tier_codigo === t.codigo ? t.color : '#374151',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea rows={2} value={form.comentarios} onChange={e => setForm({ ...form, comentarios: e.target.value })} />
          </div>

          <button type="submit" disabled={enviando} className="btn btn-primary btn-block">
            {enviando ? '🤖 Calculando...' : '⚡ Cotizar y crear lead'}
          </button>
        </form>

        <div>
          {resultado ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <h3 style={{ margin: '4px 0' }}>Cotización lista</h3>
                <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>
                  Folio: <strong style={{ color: '#FF6B35' }}>{resultado.folio}</strong>
                </p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)', color: '#fff', borderRadius: 10, padding: 16, textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 11, opacity: 0.9, textTransform: 'uppercase' }}>Total con IVA</div>
                <div style={{ fontSize: 32, fontWeight: 900 }}>{fmt$(resultado.cotizacion?.precio?.total_con_iva || 0)}</div>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
                Ruta: {resultado.cotizacion?.ruta?.origen} → {resultado.cotizacion?.ruta?.destino}<br/>
                Distancia: {resultado.cotizacion?.ruta?.distancia_km} km
              </div>
              <button onClick={() => setResultado(null)} className="btn btn-ghost btn-block">Nueva cotización</button>
            </div>
          ) : (
            <div style={{ background: '#f9fafb', border: '2px dashed #e5e7eb', borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
                Llena los datos y dale click. El resultado aparece aquí.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
