const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const getToken = () => localStorage.getItem('vivo_token');

const headers = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
};

const reqUpload = async (path, formData) => {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
};

export const fileUrl = (path) => {
  const token = getToken();
  const sep = path.includes('?') ? '&' : '?';
  return `${BASE}${path}${token ? `${sep}token=${encodeURIComponent(token)}` : ''}`;
};

export const api = {
  // ── Auth ────────────────────────────────────
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  registro: (body) => req('POST', '/auth/registro', body),
  usuarios: () => req('GET', '/auth/usuarios'),

  // ── Clientes ────────────────────────────────
  clientes: (params='') => req('GET', `/clientes${params}`),
  crearCliente: (body) => req('POST', '/clientes', body),
  actualizarCliente: (id, body) => req('PUT', `/clientes/${id}`, body),

  // ── Leads + cotizador ──────────────────────
  leadCotizarPublico: (body) => req('POST', '/leads/cotizar', body),
  leads: (params='') => req('GET', `/leads${params}`),
  detalleLead: (id) => req('GET', `/leads/${id}`),
  actualizarEstadoLead: (id, body) => req('PUT', `/leads/${id}/estado`, body),
  convertirLeadCliente: (id, body) => req('POST', `/leads/${id}/convertir-cliente`, body),
  eliminarLead: (id) => req('DELETE', `/leads/${id}`),
  asignarTransportistaLead: (id, body) => req('POST', `/leads/${id}/asignar-transportista`, body),
  brokerResumen: () => req('GET', '/leads/broker/resumen'),

  // ── Transportistas ─────────────────────────
  transportistasExternos: (params='') => req('GET', `/transportistas${params}`),
  detalleTransportista: (id) => req('GET', `/transportistas/${id}`),
  crearTransportista: (body) => req('POST', '/transportistas', body),
  actualizarTransportista: (id, body) => req('PUT', `/transportistas/${id}`, body),
  eliminarTransportista: (id) => req('DELETE', `/transportistas/${id}`),
  sugerirTransportistas: (leadId) => req('GET', `/transportistas/sugerir/${leadId}`),
  checklistTransportista: (id) => req('GET', `/transportistas/${id}/checklist`),
  verificarTransportista: (id) => req('PUT', `/transportistas/${id}/verificar`),
  rechazarTransportista: (id, motivo) => req('PUT', `/transportistas/${id}/rechazar`, { motivo }),
  suspenderTransportista: (id, motivo) => req('PUT', `/transportistas/${id}/suspender`, { motivo }),
  reactivarTransportista: (id) => req('PUT', `/transportistas/${id}/reactivar`),
  transportistaDocs: (id) => req('GET', `/transportistas/${id}/documentos`),
  subirTransportistaDoc: (id, formData) => reqUpload(`/transportistas/${id}/documentos`, formData),

  // ── Broker Finanzas (Cashflow) ────────────
  brokerDashboard: () => req('GET', '/broker-finanzas/dashboard'),
  brokerOperaciones: () => req('GET', '/broker-finanzas/operaciones'),
  brokerConcentracion: () => req('GET', '/broker-finanzas/concentracion'),
  brokerPagos: (params='') => req('GET', `/broker-finanzas/pagos${params}`),
  crearBrokerPago: (body) => req('POST', '/broker-finanzas/pagos', body),
  marcarBrokerPagoPagado: (id, body={}) => req('PUT', `/broker-finanzas/pagos/${id}/marcar-pagado`, body),
  registrarCobroLead: (leadId, body) => req('POST', `/broker-finanzas/leads/${leadId}/cobro`, body),

  // ── Agentes IA (hub unificado) ────────────
  agentesList: () => req('GET', '/agentes'),
  agentesDetalle: (nombre) => req('GET', `/agentes/${nombre}`),
  agentesConversar: (nombre, mensaje, historial=[], contexto_extra=null) =>
    req('POST', `/agentes/${nombre}/conversar`, { mensaje, historial, contexto_extra }),
  agentesHistorial: (params='') => req('GET', `/agentes/historial/invocaciones${params}`),
  agentesCostos: (dias=30) => req('GET', `/agentes/historial/costos?dias=${dias}`),

  // ── Vendedor IA ────────────────────────────
  vendedorDashboard: () => req('GET', '/vendedor-ia/dashboard'),
  vendedorConversaciones: (params='') => req('GET', `/vendedor-ia/conversaciones${params}`),
  vendedorConversacion: (id) => req('GET', `/vendedor-ia/conversaciones/${id}`),
  vendedorEnviarMensaje: (convId, contenido) => req('POST', `/vendedor-ia/conversaciones/${convId}/mensaje`, { contenido }),
  vendedorConfig: () => req('GET', '/vendedor-ia/configuracion'),
  vendedorGuardarConfig: (body) => req('PUT', '/vendedor-ia/configuracion', body),

  // ── Asignador IA ───────────────────────────
  asignadorDashboard: () => req('GET', '/asignador-ia/dashboard'),
  asignadorSugerir: (viajeId) => req('POST', `/asignador-ia/sugerir/${viajeId}`),
  asignadorAplicar: (id) => req('POST', `/asignador-ia/${id}/aplicar`),
  asignadorHistorial: (params='') => req('GET', `/asignador-ia/historial${params}`),

  // ── Retención IA ───────────────────────────
  retencionDashboard: () => req('GET', '/retencion-ia/dashboard'),
  retencionSegmento: (clasif) => req('GET', `/retencion-ia/segmentos/${clasif}`),
  retencionAcciones: (params='') => req('GET', `/retencion-ia/acciones${params}`),
  retencionCorrerCiclo: (soloScoring=false) => req('POST', '/retencion-ia/correr-ciclo', { solo_scoring: soloScoring }),

  // ── Atracción IA ───────────────────────────
  atraccionDashboard: () => req('GET', '/atraccion-ia/dashboard'),
  atraccionContenidoList: (params='') => req('GET', `/atraccion-ia/contenido${params}`),
  atraccionGenerar: (tipo, tema) => req('POST', '/atraccion-ia/contenido/generar', { tipo, tema }),

  // ── Auditor IA ──────────────────────────────
  auditorDashboard: () => req('GET', '/auditor-ia/dashboard'),
  auditorEjecuciones: () => req('GET', '/auditor-ia/ejecuciones'),
  auditorHallazgos: (params='') => req('GET', `/auditor-ia/hallazgos${params}`),
  auditorEjecutar: () => req('POST', '/auditor-ia/ejecutar'),

  // ── CFDI ────────────────────────────────────
  cfdiDashboard: () => req('GET', '/cfdi/dashboard'),
  cfdiList: (params='') => req('GET', `/cfdi${params}`),
  cfdiDetalle: (id) => req('GET', `/cfdi/${id}`),
  cfdiEmitirViaje: (viajeId) => req('POST', `/cfdi/emitir-viaje/${viajeId}`),
  cfdiPdfUrl: (id) => fileUrl(`/cfdi/${id}/pdf`),
  cfdiXmlUrl: (id) => fileUrl(`/cfdi/${id}/xml`),

  // ── Configuración / BYOK ────────────────────
  configApiKeys: () => req('GET', '/auth/api-keys'),
  configApiKeyGuardar: (clave, valor) => req('POST', `/auth/api-keys/${clave}`, { valor }),
};
