import React, { useState } from 'react';
import { api } from '../api';

// VIVO — Cotizador público. "Tu carga, VIVO."

const fmt$ = n => '$' + Math.round(parseFloat(n) || 0).toLocaleString('es-MX');

const TIPOS_CARGA = [
  { v: 'general',     l: '📦 General' },
  { v: 'fragil',      l: '🔶 Frágil' },
  { v: 'refrigerada', l: '❄️ Refrigerada' },
  { v: 'peligrosa',   l: '⚠️ Peligrosa' },
  { v: 'liquidos',    l: '💧 Líquidos' },
  { v: 'otro',        l: 'Otro' },
];

const TIERS = [
  { codigo: 'CRITICAL', nombre: 'Critical', emoji: '🚨', mult: '3x', sla: 'Recogemos en 1h · Entrega en 4-6h', garantia: '100% reembolso si fallamos', color: '#DC2626' },
  { codigo: 'EXPRESS',  nombre: 'Express',  emoji: '⚡', mult: '2x', sla: 'Mismo día · Recogemos en 2h',       garantia: '50% reembolso si fallamos',  color: '#F59E0B' },
  { codigo: 'URGENT',   nombre: 'Urgent',   emoji: '🔥', mult: '1.5x', sla: 'Mañana antes de 8am · Recogemos en 4h', garantia: '20% descuento próximo viaje', color: '#3B82F6' },
];

const ANEXOS = [
  { codigo: 'seguro_carga_premium', emoji: '🛡️', nombre: 'Seguro premium $1M cobertura', precio: 3500 },
  { codigo: 'custodia_armada',      emoji: '👮', nombre: 'Custodia armada hasta destino', precio: 8000 },
  { codigo: 'tracking_vip',         emoji: '📹', nombre: 'Tracking VIP con cámara en vivo', precio: 2000 },
];

export default function CotizadorPublico() {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    contacto_nombre: '', empresa: '', email: '', telefono: '',
    origen: '', destino: '',
    toneladas: '', tipo_carga: 'general',
    fecha_solicitada: '', hora_salida: '',
    comentarios: '',
    tier_codigo: 'EXPRESS',
    anexos_codigos: [],
  });
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const toggleAnexo = (codigo) => {
    setForm(f => ({
      ...f,
      anexos_codigos: f.anexos_codigos.includes(codigo)
        ? f.anexos_codigos.filter(x => x !== codigo)
        : [...f.anexos_codigos, codigo],
    }));
  };

  const cotizar = async (e) => {
    e.preventDefault();
    if (!form.contacto_nombre || !form.origen || !form.destino) {
      setError('Nombre, origen y destino son obligatorios');
      return;
    }
    if (!form.email && !form.telefono) {
      setError('Necesitamos email o WhatsApp para contactarte');
      return;
    }
    setEnviando(true); setError(null);
    try {
      const body = { ...form, toneladas: form.toneladas ? parseFloat(form.toneladas) : null };
      const r = await api.leadCotizarPublico(body);
      setResultado(r);
      setStep('resultado');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError(e.message); }
    finally { setEnviando(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%)',
      padding: '20px 16px 40px',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', color: '#fff', marginBottom: 28 }}>
          <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 40, fontWeight: 900, color: '#fff', boxShadow: '0 8px 24px rgba(255,107,53,0.4)' }}>V</div>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 900, background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.05em' }}>VIVO</h1>
          <p style={{ margin: '6px 0 0', color: '#FF6B35', fontSize: 16, fontWeight: 700, fontStyle: 'italic' }}>Tu carga, VIVO.</p>
          <p style={{ margin: '10px 0 0', opacity: 0.85, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>Brokerage de Urgencias Logísticas</p>
          <div style={{ display: 'inline-block', background: 'rgba(255,107,53,0.2)', border: '1px solid #FF6B35', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginTop: 12, color: '#fff' }}>⚡ Cotización en 5 min · Asignación en 15</div>
        </div>

        {step === 'form' && (
          <form onSubmit={cotizar} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#0A0A0A' }}>Cotiza tu urgencia</h2>
            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 13 }}>Te respondemos en 5 minutos con precio y disponibilidad.</p>

            {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>⚠️ {error}</div>}

            <Sec titulo="📍 Datos del viaje">
              <Row>
                <Fi label="Origen *"><input type="text" placeholder="Cuernavaca, Morelos" value={form.origen} onChange={e => setForm({ ...form, origen: e.target.value })} required /></Fi>
                <Fi label="Destino *"><input type="text" placeholder="Ciudad de México" value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} required /></Fi>
              </Row>
              <Row>
                <Fi label="Toneladas"><input type="number" step="0.1" min="0" placeholder="15" value={form.toneladas} onChange={e => setForm({ ...form, toneladas: e.target.value })} /></Fi>
                <Fi label="Tipo de carga"><select value={form.tipo_carga} onChange={e => setForm({ ...form, tipo_carga: e.target.value })}>{TIPOS_CARGA.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</select></Fi>
              </Row>
              <Row>
                <Fi label="Fecha"><input type="date" value={form.fecha_solicitada} onChange={e => setForm({ ...form, fecha_solicitada: e.target.value })} /></Fi>
                <Fi label="Hora límite entrega"><input type="time" value={form.hora_salida} onChange={e => setForm({ ...form, hora_salida: e.target.value })} /></Fi>
              </Row>
            </Sec>

            <Sec titulo="⚡ Nivel de urgencia">
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>¿Qué tan urgente es? Esto define precio y garantía.</p>
              <div style={{ display: 'grid', gap: 8 }}>
                {TIERS.map(t => (
                  <label key={t.codigo} style={{ display: 'flex', gap: 12, padding: 14, cursor: 'pointer', border: '2px solid ' + (form.tier_codigo === t.codigo ? t.color : '#e5e7eb'), borderRadius: 10, background: form.tier_codigo === t.codigo ? t.color + '12' : '#fff' }}>
                    <input type="radio" name="tier" value={t.codigo} checked={form.tier_codigo === t.codigo} onChange={() => setForm({ ...form, tier_codigo: t.codigo })} style={{ width: 18, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        <strong style={{ fontSize: 15, color: t.color }}>{t.emoji} {t.nombre}</strong>
                        <span style={{ background: t.color, color: '#fff', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>{t.mult} precio</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>{t.sla}</div>
                      <div style={{ fontSize: 11, color: t.color, marginTop: 4, fontWeight: 600 }}>✓ {t.garantia}</div>
                    </div>
                  </label>
                ))}
              </div>
            </Sec>

            <Sec titulo="➕ Servicios adicionales (opcional)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ANEXOS.map(a => (
                  <label key={a.codigo} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, cursor: 'pointer', background: form.anexos_codigos.includes(a.codigo) ? '#fff8f0' : '#f9fafb', border: '1px solid ' + (form.anexos_codigos.includes(a.codigo) ? '#FF6B35' : '#e5e7eb'), borderRadius: 8 }}>
                    <input type="checkbox" checked={form.anexos_codigos.includes(a.codigo)} onChange={() => toggleAnexo(a.codigo)} />
                    <span style={{ fontSize: 20 }}>{a.emoji}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{a.nombre}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FF6B35' }}>+{fmt$(a.precio)}</span>
                  </label>
                ))}
              </div>
            </Sec>

            <Sec titulo="👤 Tus datos">
              <Row>
                <Fi label="Tu nombre *"><input type="text" placeholder="Juan Pérez" value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })} required /></Fi>
                <Fi label="Empresa"><input type="text" placeholder="Constructora ABC" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} /></Fi>
              </Row>
              <Row>
                <Fi label="Email"><input type="email" placeholder="juan@empresa.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Fi>
                <Fi label="WhatsApp / Teléfono"><input type="tel" placeholder="55 1234 5678" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Fi>
              </Row>
              <Fi label="Comentarios (opcional)"><textarea rows={2} placeholder="Algo importante que debamos saber..." value={form.comentarios} onChange={e => setForm({ ...form, comentarios: e.target.value })} /></Fi>
            </Sec>

            <button type="submit" disabled={enviando} style={{ width: '100%', padding: '16px', background: enviando ? '#9ca3af' : 'linear-gradient(135deg, #FF6B35 0%, #E55822 100%)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: enviando ? 'wait' : 'pointer', marginTop: 8, boxShadow: '0 8px 24px rgba(255,107,53,0.4)' }}>
              {enviando ? '🤖 Calculando tu cotización...' : '⚡ Obtener mi cotización'}
            </button>

            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 12 }}>🔒 Tus datos no se comparten. Solo VIVO los usa para contactarte.</p>
          </form>
        )}

        {step === 'resultado' && resultado && <Resultado resultado={resultado} onReset={() => { setStep('form'); setResultado(null); }} />}

        <p style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', marginTop: 32 }}>VIVO · Brokerage de Urgencias Logísticas · México</p>
      </div>
    </div>
  );
}

function Sec({ titulo, children }) { return <div style={{ marginBottom: 24 }}><h3 style={{ margin: '0 0 10px', fontSize: 14, color: '#0A0A0A', fontWeight: 700 }}>{titulo}</h3>{children}</div>; }
function Row({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>{children}</div>; }
function Fi({ label, children }) { return <div><label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>{children}</div>; }

function Resultado({ resultado, onReset }) {
  const c = resultado.cotizacion || {};
  const total = c.precio?.total_con_iva || resultado.precio_final || 0;
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 56 }}>✅</div>
        <h2 style={{ margin: '8px 0 4px', fontSize: 24 }}>¡Cotización lista!</h2>
        <p style={{ color: '#6b7280', margin: 0 }}>Folio <strong style={{ color: '#FF6B35' }}>{resultado.folio}</strong></p>
      </div>
      <div style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)', color: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 12, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total con IVA</div>
        <div style={{ fontSize: 42, fontWeight: 900, marginTop: 4 }}>{fmt$(total)}</div>
      </div>
      <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13 }}>
        <strong style={{ display: 'block', marginBottom: 6 }}>📋 Detalles:</strong>
        <div>Ruta: <strong>{c.ruta?.origen} → {c.ruta?.destino}</strong></div>
        {c.ruta?.distancia_km && <div>Distancia: {c.ruta.distancia_km} km · Duración: {c.ruta.duracion_horas}h</div>}
      </div>
      <div style={{ background: '#fff8f0', borderLeft: '4px solid #FF6B35', padding: 14, borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
        <strong>📞 Próximos pasos:</strong>
        <p style={{ margin: '6px 0 0' }}>Un asesor de VIVO te contactará en los próximos minutos por WhatsApp/Email para confirmar disponibilidad y datos de pago (50% SPEI anticipo).</p>
      </div>
      <button onClick={onReset} style={{ width: '100%', padding: 12, background: '#fff', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Nueva cotización</button>
    </div>
  );
}
