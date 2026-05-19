import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ════════════════════════════════════════════════════════════════
// VIVO — Landing page pública
// Hero + Beneficios + Tiers + Casos + FAQ + CTA
// ════════════════════════════════════════════════════════════════

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Trackear visita
    fetch((process.env.REACT_APP_API_URL || 'http://localhost:4000/api') + '/atraccion-ia/tracking/visita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        evento: 'landing_view',
        utms: getUtms(),
        referrer: document.referrer,
        landing_path: window.location.pathname,
      }),
    }).catch(() => {});
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#fff',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <Header onCotizar={() => navigate('/cotizar')} />
      <Hero onCotizar={() => navigate('/cotizar')} />
      <Beneficios />
      <Tiers onCotizar={() => navigate('/cotizar')} />
      <Casos />
      <ComoFunciona />
      <FAQ />
      <CTAFinal onCotizar={() => navigate('/cotizar')} />
      <Footer />
    </div>
  );
}

function Header({ onCotizar }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(10,10,10,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>V</div>
        <div>
          <div style={{ fontWeight: 900, letterSpacing: '0.05em', background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>VIVO</div>
          <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: -2 }}>Brokerage de Urgencias</div>
        </div>
      </div>
      <button onClick={onCotizar} style={{
        padding: '10px 20px', background: 'linear-gradient(135deg, #FF6B35 0%, #E55822 100%)',
        color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(255,107,53,0.3)',
      }}>⚡ Cotizar</button>
    </header>
  );
}

function Hero({ onCotizar }) {
  return (
    <section style={{ padding: '80px 20px', textAlign: 'center', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'inline-block', background: 'rgba(255,107,53,0.15)', border: '1px solid #FF6B35', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: '0.05em' }}>
        🚨 LOGÍSTICA DE EMERGENCIA · MÉXICO
      </div>
      <h1 style={{
        fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.05, letterSpacing: '-0.02em',
      }}>
        Tu carga,{' '}
        <span style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>VIVO</span>.
      </h1>
      <p style={{ fontSize: 20, color: '#9ca3af', maxWidth: 640, margin: '0 auto 36px', lineHeight: 1.6 }}>
        Cuando otros no llegan, <strong style={{ color: '#fff' }}>VIVO sí</strong>.
        Brokerage de urgencias logísticas con cotización en 5 minutos y asignación garantizada en 15.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
        <button onClick={onCotizar} style={{
          padding: '16px 32px', background: 'linear-gradient(135deg, #FF6B35 0%, #E55822 100%)',
          color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer',
          boxShadow: '0 12px 32px rgba(255,107,53,0.4)',
        }}>⚡ Cotizar mi urgencia</button>
        <a href="#como-funciona" style={{
          padding: '16px 32px', background: 'transparent', color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, fontWeight: 700, fontSize: 16,
          textDecoration: 'none', display: 'inline-block',
        }}>¿Cómo funciona?</a>
      </div>
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', color: '#9ca3af', fontSize: 13 }}>
        <span>✅ Cotización en 5 min</span>
        <span>✅ Asignación en 15 min</span>
        <span>✅ Transportistas verificados</span>
        <span>✅ CFDI 4.0 + Carta Porte 3.0</span>
        <span>✅ Garantía de cumplimiento</span>
      </div>
    </section>
  );
}

function Beneficios() {
  const items = [
    { e: '⚡', t: 'Respuesta inmediata', d: 'Tu cotización lista en 5 minutos. Transportista asignado en 15. Sin esperas, sin promotores.' },
    { e: '🛡️', t: 'Garantía total', d: 'Si no cumplimos el SLA, te reembolsamos. Sin letra chica. Es nuestra palabra por escrito.' },
    { e: '🤖', t: 'Tecnología premium', d: 'IA que asigna al mejor transportista en segundos. Tracking GPS en vivo. Cotización dinámica.' },
    { e: '📄', t: 'Cumplimiento SAT', d: 'CFDI 4.0 + Carta Porte 3.0 automático. Tu contador feliz. Cero riesgo de multas.' },
    { e: '🚚', t: 'Red verificada', d: 'Todos nuestros transportistas pasan filtro de docs SCT, póliza, INE y contrato. Sin sorpresas.' },
    { e: '💸', t: 'Precio transparente', d: 'Ves el costo exacto antes de pagar. Multiplicador claro según urgencia. Sin sobrecostos ocultos.' },
  ];
  return (
    <section style={{ padding: '60px 20px', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, textAlign: 'center', margin: '0 0 12px', fontWeight: 900 }}>¿Por qué VIVO?</h2>
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 15, marginBottom: 48, maxWidth: 540, margin: '0 auto 48px' }}>
          No somos un broker más. Somos el bombero de la logística mexicana.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {items.map((b, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{b.e}</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>{b.t}</h3>
              <p style={{ margin: 0, fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>{b.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tiers({ onCotizar }) {
  const tiers = [
    { c: '#DC2626', e: '🚨', n: 'Critical', m: '3x', sla: 'Recogemos en 1h · Entrega en 4-6h', g: '100% reembolso si fallamos' },
    { c: '#F59E0B', e: '⚡', n: 'Express',  m: '2x', sla: 'Mismo día · Recogemos en 2h',       g: '50% reembolso si fallamos' },
    { c: '#3B82F6', e: '🔥', n: 'Urgent',   m: '1.5x', sla: 'Mañana antes 8am · Recogemos en 4h', g: '20% descuento próximo viaje' },
  ];
  return (
    <section style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, textAlign: 'center', margin: '0 0 12px', fontWeight: 900 }}>
          3 niveles de <span style={{ color: '#FF6B35' }}>urgencia</span>
        </h2>
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 15, margin: '0 auto 48px', maxWidth: 540 }}>
          Tú eliges. Pagas exactamente lo que tu urgencia requiere.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {tiers.map(t => (
            <div key={t.n} style={{
              background: 'rgba(255,255,255,0.03)',
              border: `2px solid ${t.c}`,
              borderRadius: 14,
              padding: 28,
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: -12, right: 20,
                background: t.c, color: '#fff',
                padding: '4px 12px', borderRadius: 999,
                fontSize: 11, fontWeight: 800, letterSpacing: '0.05em',
              }}>{t.m} PRECIO</div>
              <div style={{ fontSize: 48, marginBottom: 4 }}>{t.e}</div>
              <h3 style={{ margin: '0 0 12px', fontSize: 24, color: t.c }}>{t.n}</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#fff', lineHeight: 1.5 }}>{t.sla}</p>
              <div style={{ fontSize: 12, color: t.c, fontWeight: 700, marginBottom: 16 }}>✓ {t.g}</div>
              <button onClick={onCotizar} style={{
                width: '100%', padding: 12, background: t.c, color: '#fff',
                border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14,
              }}>Cotizar {t.n}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Casos() {
  const casos = [
    { sector: '🏭 Manufactura JIT', dolor: 'Línea de producción paraliza si no llega componente', porque: 'Cuando proveedor falla, VIVO mueve el componente en 4-6h salvando el paro de línea' },
    { sector: '🏗️ Construcción', dolor: 'Cemento o acero atrasado = multa por día de retraso de obra', porque: 'Reposición urgente desde otra planta. Tu obra no para.' },
    { sector: '❄️ Cadena de frío', dolor: 'Productos perecederos vencen si transportista falla', porque: 'Refrigerados de emergencia con tracking de temperatura' },
    { sector: '🎬 Eventos / Producción', dolor: 'Equipo audiovisual debe llegar antes del show', porque: 'Cargas con horario rígido. Cumplimos o reembolsamos.' },
    { sector: '💊 Farma / Medical', dolor: 'Medicamentos con cadena de custodia y vencimientos críticos', porque: 'Custodia armada + tracking + Carta Porte completo' },
    { sector: '🛍️ E-commerce premium', dolor: 'Cliente quiere "hoy o mañana antes de las 8am"', porque: 'Tier Urgent te lo entrega antes del primer café' },
  ];
  return (
    <section style={{ padding: '60px 20px', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, textAlign: 'center', margin: '0 0 12px', fontWeight: 900 }}>
          Para quién es <span style={{ color: '#FF6B35' }}>VIVO</span>
        </h2>
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 15, margin: '0 auto 48px', maxWidth: 540 }}>
          Empresas que NO pueden permitirse retrasos.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {casos.map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 22 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{c.sector}</h3>
              <div style={{ fontSize: 13, color: '#FFB627', marginBottom: 8 }}>🔴 {c.dolor}</div>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>{c.porque}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const pasos = [
    { n: '01', t: 'Cotizas', d: 'Llenas formulario en 1 minuto. Te respondemos con precio garantizado en 5 minutos.' },
    { n: '02', t: 'Anticipas 50%', d: 'Transferencia SPEI. Asignamos transportista verificado en menos de 15 minutos.' },
    { n: '03', t: 'Recogemos', d: 'Transportista llega al origen según SLA. Te avisamos cuando se embarca tu carga.' },
    { n: '04', t: 'Entregamos', d: 'Tracking GPS en vivo. Confirmación con foto y firma digital al llegar.' },
    { n: '05', t: 'Pagas 50% restante', d: 'Al firmar la entrega. Recibes CFDI 4.0 + Carta Porte 3.0 por email automático.' },
  ];
  return (
    <section id="como-funciona" style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, textAlign: 'center', margin: '0 0 48px', fontWeight: 900 }}>
          Cómo <span style={{ color: '#FF6B35' }}>funciona</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {pasos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{
                fontSize: 32, fontWeight: 900,
                background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                minWidth: 70,
              }}>{p.n}</div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 22 }}>{p.t}</h3>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: 14, lineHeight: 1.6 }}>{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const faqs = [
    { q: '¿Por qué pagar el 50% por adelantado?',
      r: 'Es nuestra forma de garantizar que el transportista estará disponible en menos de 15 minutos. En urgencias, el tiempo cuesta más que el dinero. Sin anticipo, no podemos comprometer SLA.' },
    { q: '¿Qué pasa si no llegan a tiempo?',
      r: 'Te reembolsamos según el tier: Critical = 100%, Express = 50%, Urgent = descuento de 20% en próximo viaje. Sin discusión, sin letra chica.' },
    { q: '¿Qué tipos de carga aceptan?',
      r: 'General, frágil, refrigerada, líquidos y peligrosos. Para peligrosos necesitamos detalles de la sustancia. Documentación completa: NOM, ficha técnica, permisos.' },
    { q: '¿Operan en toda la república?',
      r: 'Sí. Tenemos red de transportistas verificados en las 32 entidades del país. Algunas zonas requieren tier Urgent por logística.' },
    { q: '¿Emiten factura?',
      r: 'Sí. CFDI 4.0 con complemento Carta Porte 3.0 automático. Llega a tu email apenas se confirma la entrega. Cumplimiento SAT 100%.' },
    { q: '¿Cuánto puedo ahorrar vs broker tradicional?',
      r: 'Depende: si necesitas urgencia, pagas premium (1.5x-3x precio normal). Pero el costo de NO tener la carga a tiempo es 10-50x mayor. Es matemática simple.' },
  ];
  return (
    <section style={{ padding: '60px 20px', background: '#111', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, textAlign: 'center', margin: '0 0 48px', fontWeight: 900 }}>
          Preguntas <span style={{ color: '#FF6B35' }}>frecuentes</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {faqs.map((f, i) => (
            <details key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '14px 18px',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>{f.q}</summary>
              <p style={{ margin: '12px 0 0', color: '#9ca3af', fontSize: 14, lineHeight: 1.6 }}>{f.r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFinal({ onCotizar }) {
  return (
    <section style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.1 }}>
          ¿Tu carga necesita moverse <span style={{ color: '#FF6B35' }}>ya</span>?
        </h2>
        <p style={{ fontSize: 18, color: '#9ca3af', margin: '0 0 32px' }}>
          Cotiza ahora. En 5 minutos sabes el precio y la disponibilidad.
        </p>
        <button onClick={onCotizar} style={{
          padding: '18px 40px',
          background: 'linear-gradient(135deg, #FF6B35 0%, #E55822 100%)',
          color: '#fff', border: 'none', borderRadius: 12,
          fontWeight: 800, fontSize: 18, cursor: 'pointer',
          boxShadow: '0 16px 40px rgba(255,107,53,0.5)',
        }}>⚡ Cotizar mi urgencia</button>
        <p style={{ color: '#6b7280', fontSize: 12, marginTop: 16 }}>
          Sin compromiso. Sin tarjeta. Solo respuesta inmediata.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      padding: '40px 20px',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      textAlign: 'center',
      color: '#6b7280',
      fontSize: 13,
    }}>
      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: '#fff' }}>VIVO</strong> · Brokerage de Urgencias Logísticas
      </div>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <a href="/privacidad" style={{ color: '#9ca3af', textDecoration: 'none' }}>Aviso de privacidad</a>
        <a href="/terminos" style={{ color: '#9ca3af', textDecoration: 'none' }}>Términos y condiciones</a>
        <a href="/cotizar" style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: 700 }}>Cotizar</a>
      </div>
      <div style={{ fontSize: 11, opacity: 0.6 }}>
        © {new Date().getFullYear()} VIVO · Hecho en México 🇲🇽 con ❤️
      </div>
    </footer>
  );
}

// ── Helpers ──
function getSessionId() {
  let id = sessionStorage.getItem('vivo_session_id');
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('vivo_session_id', id);
  }
  return id;
}

function getUtms() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source'),
    utm_medium: p.get('utm_medium'),
    utm_campaign: p.get('utm_campaign'),
    utm_content: p.get('utm_content'),
    utm_term: p.get('utm_term'),
  };
}
