import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// ════════════════════════════════════════════════════════════════
// VIVO — Onboarding wizard (primera vez)
// 1. Cambiar password (forzado si es vivo2026)
// 2. Anthropic API key (BYOK)
// 3. Datos fiscales empresa
// 4. Tour rápido
// ════════════════════════════════════════════════════════════════

const PASOS = ['Bienvenida', 'Contraseña', 'Anthropic Key', 'Datos fiscales', 'Listo'];

export default function Onboarding() {
  const { usuario, setUsuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [paso, setPaso] = useState(0);
  const [yaConfig, setYaConfig] = useState(false);

  useEffect(() => {
    // Si ya completó onboarding antes, no forzarlo (a menos que entren por URL directa)
    const completado = localStorage.getItem('vivo_onboarding_done');
    if (completado === '1') setYaConfig(true);
  }, []);

  const next = () => setPaso(p => Math.min(p + 1, PASOS.length - 1));
  const prev = () => setPaso(p => Math.max(p - 1, 0));

  const finalizar = () => {
    localStorage.setItem('vivo_onboarding_done', '1');
    toast.success('¡VIVO está listo para volar! 🚀');
    navigate('/');
  };

  const skip = () => {
    localStorage.setItem('vivo_onboarding_done', '1');
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
      color: '#fff',
      fontFamily: "Inter, sans-serif",
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {PASOS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= paso ? 'linear-gradient(90deg, #FF6B35, #FFB627)' : '#1f2937',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
        <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>
          Paso {paso + 1} de {PASOS.length} — {PASOS[paso]}
        </div>

        {yaConfig && paso === 0 && (
          <div style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid #3B82F6',
            borderRadius: 8,
            padding: 10,
            fontSize: 12,
            marginBottom: 16,
            color: '#9ca3af',
          }}>
            Ya completaste el onboarding antes. Puedes <button onClick={skip}
              style={{ background: 'transparent', border: 'none', color: '#FFB627', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              saltarlo
            </button> o revisar cada paso.
          </div>
        )}

        {paso === 0 && <PasoBienvenida usuario={usuario} onNext={next} />}
        {paso === 1 && <PasoPassword usuario={usuario} setUsuario={setUsuario} toast={toast} onNext={next} onPrev={prev} />}
        {paso === 2 && <PasoAnthropic toast={toast} onNext={next} onPrev={prev} />}
        {paso === 3 && <PasoFiscal toast={toast} onNext={next} onPrev={prev} />}
        {paso === 4 && <PasoListo onFin={finalizar} />}
      </div>
    </div>
  );
}

function PasoBienvenida({ usuario, onNext }) {
  return (
    <Tarjeta>
      <div style={{ fontSize: 60, textAlign: 'center', marginBottom: 12 }}>⚡</div>
      <h1 style={{
        fontSize: 32, margin: '0 0 8px', textAlign: 'center', fontWeight: 800,
        background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>Bienvenido a VIVO, {usuario?.nombre || ''}</h1>
      <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: 14, lineHeight: 1.6 }}>
        Eres el director del brokerage de urgencias más rápido de México.
        En los próximos 4 pasos vamos a dejarte 100% listo para operar:
      </p>
      <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>
        <Bullet emoji="🔒" texto="Cambias tu contraseña por una segura" />
        <Bullet emoji="🤖" texto="Conectas tu Anthropic API key (tus 12 agentes despiertan)" />
        <Bullet emoji="🧾" texto="Llenas datos fiscales para emitir CFDI 4.0 al SAT" />
        <Bullet emoji="🎯" texto="Tour rápido de las funciones clave" />
      </div>
      <Boton onClick={onNext} ancho>Empezar ⚡</Boton>
    </Tarjeta>
  );
}

function PasoPassword({ usuario, setUsuario, toast, onNext, onPrev }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirma, setConfirma] = useState('');
  const [saving, setSaving] = useState(false);

  const handleGuardar = async () => {
    if (!nueva || nueva.length < 8) return toast.error('La nueva contraseña debe tener al menos 8 caracteres');
    if (nueva !== confirma) return toast.error('Las contraseñas no coinciden');
    if (nueva === 'vivo2026') return toast.error('No puedes usar la contraseña por defecto');
    try {
      setSaving(true);
      // Endpoint esperado: PUT /auth/cambiar-password
      await fetch((process.env.REACT_APP_API_URL || 'http://localhost:4000/api') + '/auth/cambiar-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('vivo_token')}`,
        },
        body: JSON.stringify({ password_actual: actual, password_nueva: nueva }),
      }).then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'No se pudo cambiar la contraseña');
        return data;
      });
      toast.success('Contraseña actualizada');
      onNext();
    } catch (e) {
      // Si el backend aún no tiene el endpoint, no bloqueamos el wizard
      toast.warn('Aviso: ' + e.message + ' (puedes continuar)');
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tarjeta>
      <Titulo emoji="🔒">Asegura tu cuenta</Titulo>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Estás usando la contraseña inicial. Pónle una de verdad antes de operar.
      </p>
      <Input label="Contraseña actual" type="password" value={actual} onChange={setActual} placeholder="vivo2026" />
      <Input label="Nueva contraseña" type="password" value={nueva} onChange={setNueva} placeholder="Mínimo 8 caracteres" />
      <Input label="Confirma nueva contraseña" type="password" value={confirma} onChange={setConfirma} />
      <Botones>
        <BotonSec onClick={onPrev}>← Atrás</BotonSec>
        <BotonSec onClick={onNext}>Saltar</BotonSec>
        <Boton onClick={handleGuardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar →'}</Boton>
      </Botones>
    </Tarjeta>
  );
}

function PasoAnthropic({ toast, onNext, onPrev }) {
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);

  const probar = async () => {
    if (!valor) return toast.error('Pega tu API key primero');
    try {
      setSaving(true);
      await api.configApiKeyProbar('anthropic', valor);
      toast.success('La key funciona correctamente ✅');
      setTested(true);
    } catch (e) {
      toast.error('Key inválida: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const guardar = async () => {
    if (!valor) return onNext();
    try {
      setSaving(true);
      await api.configApiKeyGuardar('anthropic', valor);
      toast.success('Anthropic key guardada. Tus 12 agentes están vivos 🤖');
      onNext();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tarjeta>
      <Titulo emoji="🤖">Despierta a tus 12 agentes IA</Titulo>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 12px' }}>
        VIVO usa <strong>Claude (Anthropic)</strong> para que tus agentes vendan, asignen, retengan y auditen
        sin que tú muevas un dedo. Necesitas una API key propia.
      </p>
      <div style={{
        background: 'rgba(255,182,39,0.08)',
        border: '1px solid #FFB627',
        borderRadius: 8,
        padding: 12,
        fontSize: 12,
        color: '#FFB627',
        marginBottom: 16,
      }}>
        Saca tu key gratis en <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
          style={{ color: '#FFB627', textDecoration: 'underline' }}>console.anthropic.com</a>.
        Empieza con $5 de crédito.
      </div>
      <Input label="Anthropic API Key" type="password" value={valor} onChange={(v) => { setValor(v); setTested(false); }}
        placeholder="sk-ant-api03-..." />
      <Botones>
        <BotonSec onClick={onPrev}>← Atrás</BotonSec>
        <BotonSec onClick={onNext}>Saltar por ahora</BotonSec>
        <BotonSec onClick={probar} disabled={saving || !valor}>Probar</BotonSec>
        <Boton onClick={guardar} disabled={saving}>
          {saving ? 'Guardando...' : (tested ? 'Guardar ✅' : 'Guardar →')}
        </Boton>
      </Botones>
    </Tarjeta>
  );
}

function PasoFiscal({ toast, onNext, onPrev }) {
  const [empresa, setEmpresa] = useState({
    razon_social: '',
    rfc: '',
    regimen_fiscal: '601',
    codigo_postal: '',
    direccion: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.configEmpresa().then(d => {
      if (d) setEmpresa(prev => ({ ...prev, ...d }));
    }).catch(() => {});
  }, []);

  const guardar = async () => {
    try {
      setSaving(true);
      await api.configGuardarEmpresa(empresa);
      toast.success('Datos fiscales guardados');
      onNext();
    } catch (e) {
      toast.warn('Aviso: ' + e.message + ' (puedes continuar)');
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tarjeta>
      <Titulo emoji="🧾">Datos fiscales para CFDI 4.0</Titulo>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
        Cuando ganes un lead VIVO emite CFDI + Carta Porte automático. Llena lo básico:
      </p>
      <Input label="Razón social" value={empresa.razon_social} onChange={v => setEmpresa({ ...empresa, razon_social: v })} placeholder="VIVO Brokerage S.A.P.I. de C.V." />
      <Input label="RFC" value={empresa.rfc} onChange={v => setEmpresa({ ...empresa, rfc: v.toUpperCase() })} placeholder="VIV260519AB1" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Input label="Régimen fiscal" value={empresa.regimen_fiscal} onChange={v => setEmpresa({ ...empresa, regimen_fiscal: v })} placeholder="601" />
        <Input label="Código postal" value={empresa.codigo_postal} onChange={v => setEmpresa({ ...empresa, codigo_postal: v })} placeholder="62000" />
      </div>
      <Input label="Dirección" value={empresa.direccion} onChange={v => setEmpresa({ ...empresa, direccion: v })} placeholder="Av. Plan de Ayala 123, Cuernavaca, Morelos" />
      <Botones>
        <BotonSec onClick={onPrev}>← Atrás</BotonSec>
        <BotonSec onClick={onNext}>Saltar</BotonSec>
        <Boton onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar →'}</Boton>
      </Botones>
    </Tarjeta>
  );
}

function PasoListo({ onFin }) {
  return (
    <Tarjeta>
      <div style={{ fontSize: 60, textAlign: 'center', marginBottom: 12 }}>🚀</div>
      <h1 style={{
        fontSize: 32, margin: '0 0 8px', textAlign: 'center', fontWeight: 800,
        background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>¡Tu broker está VIVO!</h1>
      <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: 14, lineHeight: 1.6 }}>
        Lo siguiente que puedes hacer:
      </p>
      <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
        <Bullet emoji="📊" texto="Dashboard: KPIs en vivo de leads, viajes, cashflow" />
        <Bullet emoji="🎯" texto="Leads: pipeline visual con conversión por tier" />
        <Bullet emoji="🤖" texto="Agentes IA: conversa con cualquiera de los 12 agentes" />
        <Bullet emoji="⚡" texto="Cotizar: emite cotización en menos de 30 segundos" />
        <Bullet emoji="💸" texto="Costos IA: monitorea cuánto gastan tus agentes Claude" />
      </div>
      <Boton onClick={onFin} ancho>Ir al dashboard ⚡</Boton>
    </Tarjeta>
  );
}

// ── Primitivos ─────────────────────────────────────────────

function Tarjeta({ children }) {
  return (
    <div style={{
      background: '#0F0F0F',
      border: '1px solid #1f2937',
      borderRadius: 14,
      padding: 28,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>{children}</div>
  );
}

function Titulo({ emoji, children }) {
  return (
    <h2 style={{ margin: '0 0 4px', fontSize: 22, color: '#fff', fontWeight: 700 }}>
      <span style={{ marginRight: 8 }}>{emoji}</span>{children}
    </h2>
  );
}

function Bullet({ emoji, texto }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#0A0A0A', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', fontSize: 13,
    }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span>{texto}</span>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#0A0A0A',
          border: '1px solid #374151',
          borderRadius: 8,
          color: '#fff',
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function Botones({ children }) {
  return <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{children}</div>;
}

function Boton({ children, onClick, disabled, ancho }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 22px',
      background: disabled ? '#374151' : 'linear-gradient(135deg, #FF6B35 0%, #E55822 100%)',
      color: '#fff', border: 'none', borderRadius: 10,
      fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14,
      width: ancho ? '100%' : 'auto',
      marginTop: ancho ? 24 : 0,
    }}>{children}</button>
  );
}

function BotonSec({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 18px',
      background: 'transparent', color: '#9ca3af',
      border: '1px solid #374151', borderRadius: 10,
      fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13,
    }}>{children}</button>
  );
}
