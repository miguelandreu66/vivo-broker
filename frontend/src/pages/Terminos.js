import React from 'react';
import { useNavigate } from 'react-router-dom';

// ════════════════════════════════════════════════════════════════
// VIVO — Términos y Condiciones B2B
// Brokerage de urgencias logísticas — contrato entre empresas
// ════════════════════════════════════════════════════════════════

export default function Terminos() {
  const navigate = useNavigate();
  return (
    <LegalLayout titulo="Términos y Condiciones" actualizado="19 de mayo de 2026" onVolver={() => navigate('/landing')}>
      <Seccion titulo="1. Naturaleza del servicio">
        <p>
          <strong>VIVO Brokerage de Urgencias Logísticas S.A.P.I. de C.V.</strong>
          (en adelante "VIVO") opera como <strong>intermediario logístico
          (broker)</strong> entre el <strong>Cliente</strong> (cargador) y
          <strong> transportistas terceros independientes</strong> que ejecutan el
          servicio físico de transporte. VIVO no es porteador y no opera flota
          propia.
        </p>
        <p>
          La aceptación de una cotización emitida por VIVO constituye un contrato
          comercial B2B (entre empresas) y supone la aceptación total de los
          presentes términos.
        </p>
      </Seccion>

      <Seccion titulo="2. Tiers de servicio y SLA">
        <p>VIVO opera tres niveles de urgencia con compromisos diferenciados:</p>
        <Lista items={[
          'CRITICAL (3x tarifa base): asignación en ≤ 15 minutos, salida en ≤ 2 horas, monitoreo continuo.',
          'EXPRESS (2x tarifa base): asignación en ≤ 30 minutos, salida en ≤ 4 horas.',
          'URGENT (1.5x tarifa base): asignación en ≤ 60 minutos, salida en ≤ 8 horas.',
        ]} />
        <p style={{ marginTop: 12 }}>
          Si VIVO incumple el SLA de asignación por causa imputable a VIVO
          (excluyendo fuerza mayor, falsa documentación del cliente o eventos
          fuera de control razonable), se aplicará un crédito del <strong>10% del
          valor del flete</strong> al siguiente servicio.
        </p>
      </Seccion>

      <Seccion titulo="3. Cotización y aceptación">
        <p>
          Toda cotización emitida por VIVO tiene vigencia de <strong>24 horas</strong>
          salvo indicación expresa distinta. La cotización incluye flete base,
          ajuste por tier de urgencia, casetas estimadas y subtotal de IVA.
          La aceptación se realiza por correo, WhatsApp o portal y debe ser
          inequívoca.
        </p>
        <p>
          Cualquier modificación posterior a la aceptación (cambio de origen,
          destino, peso, mercancía, ventanas de entrega) puede generar
          re-cotización y cargos adicionales.
        </p>
      </Seccion>

      <Seccion titulo="4. Obligaciones del Cliente">
        <Lista items={[
          'Proporcionar información veraz y completa sobre la carga (peso, dimensiones, naturaleza, valor declarado, requisitos especiales).',
          'Entregar constancia de situación fiscal vigente para emisión de CFDI.',
          'Tener la mercancía lista para carga en la ventana acordada.',
          'Designar persona responsable para entrega y recepción.',
          'Notificar inmediatamente cualquier incidencia o discrepancia.',
          'Pagar conforme a las condiciones establecidas.',
        ]} />
      </Seccion>

      <Seccion titulo="5. Obligaciones del Transportista (vía VIVO)">
        <p>
          VIVO selecciona transportistas que cumplan criterios mínimos:
          documentación SCT vigente, póliza de seguro de responsabilidad civil
          activa, historial verificable y aceptación de las condiciones de VIVO.
        </p>
        <Lista items={[
          'Ejecutar el viaje en los plazos comprometidos.',
          'Mantener la mercancía bajo custodia y seguro durante el trayecto.',
          'Emitir Carta Porte 3.0 ante el SAT cuando aplique.',
          'Reportar incidencias, retrasos o desvíos inmediatamente.',
        ]} />
      </Seccion>

      <Seccion titulo="6. Tarifas, pagos y CFDI">
        <p>
          Las tarifas se cotizan en <strong>Pesos Mexicanos (MXN)</strong> más IVA
          (16%) y otros impuestos aplicables. Las formas de pago aceptadas son
          transferencia electrónica (SPEI) y depósito bancario. No aceptamos
          efectivo por montos superiores a los umbrales establecidos en la Ley
          Federal para la Prevención e Identificación de Operaciones con Recursos
          de Procedencia Ilícita.
        </p>
        <p>
          Condiciones estándar:
        </p>
        <Lista items={[
          'Clientes nuevos: anticipo de 50% al confirmar y 50% contra entrega satisfactoria.',
          'Clientes con línea de crédito aprobada: 7, 15 o 30 días según convenio firmado.',
          'CFDI 4.0 emitido en máximo 72 horas tras entrega satisfactoria, conforme al uso de CFDI declarado por el Cliente.',
          'Carta Porte 3.0 incluida cuando la operación lo requiera por norma SAT.',
        ]} />
        <p style={{ marginTop: 12 }}>
          La mora en pago activa un interés moratorio del <strong>3% mensual</strong>
          sobre el saldo vencido y suspende líneas de crédito hasta regularización.
        </p>
      </Seccion>

      <Seccion titulo="7. Responsabilidad y límites">
        <p>
          La responsabilidad por daño, pérdida o avería de la mercancía corresponde
          al transportista físico conforme a su póliza de responsabilidad civil
          vigente y a la Ley de Caminos, Puentes y Autotransporte Federal y su
          reglamento.
        </p>
        <p>
          <strong>VIVO actúa como intermediario</strong>: coordina la operación,
          verifica la documentación del transportista al momento de asignación y
          facilita la resolución de disputas, pero <strong>no asume responsabilidad
          directa por hechos imputables exclusivamente al transportista físico</strong>
          más allá de lo estipulado por la legislación aplicable a brokers logísticos.
        </p>
        <p>
          Se recomienda al Cliente contratar <strong>seguro de carga propio</strong>
          cuando el valor declarado de la mercancía exceda los límites estándar
          del seguro de responsabilidad civil del autotransporte.
        </p>
      </Seccion>

      <Seccion titulo="8. Cancelaciones">
        <Lista items={[
          'Cancelación por el Cliente antes de la asignación: sin costo.',
          'Cancelación tras asignación y antes de salida: cargo del 15% de la tarifa cotizada.',
          'Cancelación con unidad en sitio o en tránsito: cargo del 50% más kilómetros recorridos al precio por km del tier contratado.',
          'Cancelación por VIVO o transportista por incumplimiento del Cliente: sin reembolso de gastos incurridos.',
        ]} />
      </Seccion>

      <Seccion titulo="9. Fuerza mayor">
        <p>
          Ninguna parte será responsable por incumplimientos derivados de fuerza
          mayor o caso fortuito (bloqueos carreteros, desastres naturales,
          pandemias, actos de autoridad, huelgas generales, ciberataques masivos
          al sector). La parte afectada deberá notificar en cuanto sea posible y
          ambas partes negociarán de buena fe.
        </p>
      </Seccion>

      <Seccion titulo="10. Confidencialidad">
        <p>
          La información compartida entre las partes (rutas, tarifas, volúmenes,
          clientes finales) se considera <strong>confidencial</strong> y no podrá
          ser divulgada a terceros sin consentimiento escrito, salvo obligación
          legal o regulatoria.
        </p>
      </Seccion>

      <Seccion titulo="11. Datos personales">
        <p>
          El tratamiento de datos personales se rige por nuestro
          <a href="/privacidad" style={{ color: '#FFB627' }}> Aviso de Privacidad</a>
          que forma parte integral de estos términos.
        </p>
      </Seccion>

      <Seccion titulo="12. Modificaciones">
        <p>
          VIVO podrá modificar estos términos. Las actualizaciones serán publicadas
          en <strong>https://vivocargo.com/terminos</strong>. Para clientes con
          contrato marco firmado, las modificaciones se notificarán con 15 días
          de anticipación.
        </p>
      </Seccion>

      <Seccion titulo="13. Jurisdicción y ley aplicable">
        <p>
          Estos términos se rigen por las leyes de los <strong>Estados Unidos
          Mexicanos</strong>. Para cualquier controversia las partes se someten
          expresamente a la jurisdicción de los <strong>tribunales competentes
          de Cuernavaca, Morelos</strong>, renunciando a cualquier otro fuero
          que pudiera corresponderles.
        </p>
      </Seccion>

      <Seccion titulo="14. Contacto">
        <p>
          Para cualquier asunto relacionado con estos términos:
          <br />Correo: <strong>legal@vivocargo.com</strong>
          <br />Operaciones: <strong>operaciones@vivocargo.com</strong>
          <br />Soporte: <strong>soporte@vivocargo.com</strong>
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
