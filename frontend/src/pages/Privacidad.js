import React from 'react';
import { useNavigate } from 'react-router-dom';

// ════════════════════════════════════════════════════════════════
// VIVO — Aviso de Privacidad
// Cumple LFPDPPP (Ley Federal de Protección de Datos Personales
// en Posesión de los Particulares) — México
// ════════════════════════════════════════════════════════════════

export default function Privacidad() {
  const navigate = useNavigate();
  return (
    <LegalLayout titulo="Aviso de Privacidad" actualizado="19 de mayo de 2026" onVolver={() => navigate('/landing')}>
      <Seccion titulo="1. Identidad y domicilio del responsable">
        <p>
          <strong>VIVO Brokerage de Urgencias Logísticas S.A.P.I. de C.V.</strong>
          (en adelante "VIVO"), con domicilio fiscal en la Ciudad de Cuernavaca,
          Morelos, México, es el responsable del tratamiento de sus datos personales.
        </p>
        <p>
          Para cualquier asunto relacionado con este aviso, contacte:
          <br />
          Correo: <strong>privacidad@vivocargo.com</strong>
          <br />
          Sitio web: <strong>https://vivocargo.com</strong>
        </p>
      </Seccion>

      <Seccion titulo="2. Datos personales que recabamos">
        <p>Para prestar nuestros servicios de brokerage logístico recabamos:</p>
        <Lista items={[
          'Datos de identificación: nombre, denominación social, RFC, dirección fiscal.',
          'Datos de contacto: correo electrónico, teléfono, WhatsApp.',
          'Datos comerciales: cargo, empresa, sector industrial.',
          'Datos operativos: origen y destino de cargas, mercancía transportada, peso, dimensiones.',
          'Datos fiscales: constancia de situación fiscal, régimen, uso de CFDI.',
          'Datos de pago: método de pago, referencias bancarias (no almacenamos números de tarjeta completos).',
          'Datos de navegación: IP, navegador, páginas visitadas, parámetros UTM (cookies y similares).',
        ]} />
        <p style={{ marginTop: 12 }}>
          <strong>No recabamos datos personales sensibles</strong> (origen racial,
          estado de salud, preferencias sexuales, opiniones políticas, creencias
          religiosas).
        </p>
      </Seccion>

      <Seccion titulo="3. Finalidades del tratamiento">
        <p><strong>Finalidades primarias</strong> (necesarias para el servicio):</p>
        <Lista items={[
          'Cotizar, asignar y operar servicios de transporte de carga.',
          'Emitir comprobantes fiscales digitales (CFDI 4.0) y Carta Porte 3.0 ante el SAT.',
          'Gestionar cobranza, facturación y conciliación de pagos.',
          'Atender soporte, disputas y reclamaciones operativas.',
          'Cumplir obligaciones legales, fiscales y regulatorias.',
        ]} />
        <p style={{ marginTop: 12 }}>
          <strong>Finalidades secundarias</strong> (puede oponerse sin afectar el servicio):
        </p>
        <Lista items={[
          'Enviar comunicaciones comerciales, ofertas y novedades.',
          'Realizar análisis de mercado y mejorar nuestros servicios mediante agentes de IA.',
          'Invitar a eventos, capacitaciones o programas de fidelización.',
        ]} />
        <p style={{ marginTop: 12 }}>
          Si no desea recibir comunicaciones secundarias envíe correo a
          <strong> privacidad@vivocargo.com</strong> con asunto "BAJA".
        </p>
      </Seccion>

      <Seccion titulo="4. Uso de inteligencia artificial">
        <p>
          VIVO opera con 12 agentes de IA basados en modelos de lenguaje
          (Anthropic Claude) que procesan información de cotizaciones, leads,
          clientes y transportistas para automatizar venta, asignación, retención
          y auditoría operativa.
        </p>
        <p>
          Estos agentes <strong>no comparten datos personales identificables con
          terceros distintos al proveedor del modelo</strong>, y los datos enviados
          al modelo se procesan bajo políticas de no entrenamiento por parte del
          proveedor. Las decisiones automatizadas relevantes (ej. asignación de
          transportista, ajuste de tarifa) <strong>siempre tienen revisión humana
          opcional antes de ejecutarse</strong>.
        </p>
      </Seccion>

      <Seccion titulo="5. Transferencias de datos">
        <p>Sus datos pueden transferirse a:</p>
        <Lista items={[
          'Servicio de Administración Tributaria (SAT) — obligación fiscal.',
          'Proveedor autorizado de certificación (PAC) — emisión de CFDI y Carta Porte.',
          'Transportistas asignados a su carga — datos operativos mínimos para ejecutar el servicio.',
          'Proveedores de infraestructura (Railway, Anthropic, Twilio, SendGrid, Mapbox) bajo contratos de confidencialidad.',
          'Autoridades competentes cuando exista requerimiento legal fundado.',
        ]} />
        <p style={{ marginTop: 12 }}>
          Todas las transferencias se realizan bajo el principio de minimización
          (solo los datos estrictamente necesarios).
        </p>
      </Seccion>

      <Seccion titulo="6. Derechos ARCO">
        <p>
          Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong>
          (ARCO) al tratamiento de sus datos, así como a revocar el consentimiento
          otorgado. Para ejercer estos derechos envíe solicitud a
          <strong> privacidad@vivocargo.com</strong> indicando:
        </p>
        <Lista items={[
          'Nombre completo y domicilio o medio de contacto.',
          'Documento que acredite identidad (INE/pasaporte) o representación legal.',
          'Descripción clara del derecho a ejercer.',
          'Cualquier elemento que facilite la localización de sus datos.',
        ]} />
        <p style={{ marginTop: 12 }}>
          Responderemos en un plazo máximo de <strong>20 días hábiles</strong>
          conforme al artículo 32 de la LFPDPPP.
        </p>
      </Seccion>

      <Seccion titulo="7. Cookies y tecnologías similares">
        <p>
          Utilizamos cookies de sesión y almacenamiento local para mantener su
          sesión activa, recordar preferencias y analizar tráfico mediante
          parámetros UTM. No usamos cookies de terceros para publicidad
          comportamental. Puede desactivar las cookies desde su navegador, pero
          algunas funciones del sitio podrían no operar correctamente.
        </p>
      </Seccion>

      <Seccion titulo="8. Cambios al aviso">
        <p>
          VIVO podrá actualizar este aviso. Las modificaciones estarán disponibles
          en <strong>https://vivocargo.com/privacidad</strong> con su fecha de
          actualización. Cambios sustanciales serán notificados a clientes activos
          por correo electrónico.
        </p>
      </Seccion>

      <Seccion titulo="9. Autoridad regulatoria">
        <p>
          Si considera que su derecho a la protección de datos ha sido vulnerado
          puede acudir al <strong>Instituto Nacional de Transparencia, Acceso a la
          Información y Protección de Datos Personales (INAI)</strong>:
          <br />www.inai.org.mx
        </p>
      </Seccion>
    </LegalLayout>
  );
}

function LegalLayout({ titulo, actualizado, children, onVolver }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#fff',
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '40px 20px 80px',
    }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <button onClick={onVolver} style={{
          background: 'transparent',
          color: '#FFB627',
          border: '1px solid #FFB627',
          borderRadius: 8,
          padding: '6px 14px',
          marginBottom: 24,
          fontSize: 13,
          cursor: 'pointer',
        }}>← Volver</button>

        <h1 style={{
          fontSize: 36,
          margin: '0 0 8px',
          background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: 800,
        }}>{titulo}</h1>
        <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 32px' }}>
          Última actualización: {actualizado}
        </p>

        <div style={{ lineHeight: 1.7, fontSize: 15, color: '#d1d5db' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: 20,
        color: '#FF6B35',
        margin: '0 0 12px',
        fontWeight: 700,
      }}>{titulo}</h2>
      {children}
    </section>
  );
}

function Lista({ items }) {
  return (
    <ul style={{ paddingLeft: 22, margin: '8px 0' }}>
      {items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
    </ul>
  );
}
