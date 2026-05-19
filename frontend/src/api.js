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
  // ══ Auth ═══════════════════════════════════════════════
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  registro: (body) => req('POST', '/auth/registro', body),
  usuarios: () => req('GET', '/auth/usuarios'),

  // ══ Configuración (BYOK API Keys) ══════════════════════
  configApiKeys: () => req('GET', '/auth/api-keys'),
  configApiKeyGuardar: (clave, valor) => req('POST', `/auth/api-keys/${clave}`, { valor }),
  configApiKeyEliminar: (clave) => req('DELETE', `/auth/api-keys/${clave}`),
  configApiKeyProbar: (clave, valor) => req('POST', `/auth/api-keys/${clave}/probar`, { valor }),
  configEmpresa: () => req('GET', '/configuracion/empresa'),
  configGuardarEmpresa: (body) => req('PUT', '/configuracion/empresa', body),

  // ══ Clientes ════════════════════════════════════════════
  clientes: (params = '') => req('GET', `/clientes${params}`),
  detalleCliente: (id) => req('GET', `/clientes/${id}`),
  crearCliente: (body) => req('POST', '/clientes', body),
  actualizarCliente: (id, body) => req('PUT', `/clientes/${id}`, body),

  // ══ Leads ═══════════════════════════════════════════════
  leadCotizarPublico: (body) => req('POST', '/leads/cotizar', body),
  leads: (params = '') => req('GET', `/leads${params}`),
  detalleLead: (id) => req('GET', `/leads/${id}`),
  actualizarEstadoLead: (id, body) => req('PUT', `/leads/${id}/estado`, body),
  convertirLeadCliente: (id, body) => req('POST', `/leads/${id}/convertir-cliente`, body),
  eliminarLead: (id) => req('DELETE', `/leads/${id}`),
  asignarTransportistaLead: (id, body) => req('POST', `/leads/${id}/asignar-transportista`, body),
  brokerResumen: () => req('GET', '/leads/broker/resumen'),
  operativoStats: (dias = 30) => req('GET', `/leads/operativo/stats?dias=${dias}`),

  // ══ Transportistas ══════════════════════════════════════
  transportistasExternos: (params = '') => req('GET', `/transportistas${params}`),
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
  recalcularScoreTransportista: (id) => req('POST', `/transportistas/${id}/recalcular-score`),

  // Documentos
  transportistaDocsConfig: () => req('GET', '/transportistas/config'),
  transportistaDocs: (id) => req('GET', `/transportistas/${id}/documentos`),
  subirTransportistaDoc: (id, formData) => reqUpload(`/transportistas/${id}/documentos`, formData),
  actualizarTransportistaDoc: (id, body) => req('PUT', `/transportistas/documentos/${id}`, body),
  eliminarTransportistaDoc: (id) => req('DELETE', `/transportistas/documentos/${id}`),
  transportistaDocArchivoUrl: (id) => fileUrl(`/transportistas/documentos/${id}/archivo`),
  alertasVigenciaTransportistas: () => req('GET', '/transportistas/documentos/alertas-vigencia'),

  // ══ Broker Finanzas (Cashflow) ══════════════════════════
  brokerDashboard: () => req('GET', '/broker-finanzas/dashboard'),
  brokerOperaciones: () => req('GET', '/broker-finanzas/operaciones'),
  brokerConcentracion: () => req('GET', '/broker-finanzas/concentracion'),
  brokerPagos: (params = '') => req('GET', `/broker-finanzas/pagos${params}`),
  crearBrokerPago: (body) => req('POST', '/broker-finanzas/pagos', body),
  marcarBrokerPagoPagado: (id, body = {}) => req('PUT', `/broker-finanzas/pagos/${id}/marcar-pagado`, body),
  cancelarBrokerPago: (id, motivo) => req('PUT', `/broker-finanzas/pagos/${id}/cancelar`, { motivo }),
  eliminarBrokerPago: (id) => req('DELETE', `/broker-finanzas/pagos/${id}`),
  registrarCobroLead: (leadId, body) => req('POST', `/broker-finanzas/leads/${leadId}/cobro`, body),
  brokerConfig: (body) => req('PUT', '/broker-finanzas/configuracion', body),

  // ══ Hub Agentes IA ══════════════════════════════════════
  agentesList: () => req('GET', '/agentes'),
  agentesDetalle: (nombre) => req('GET', `/agentes/${nombre}`),
  agentesConversar: (nombre, mensaje, historial = [], contexto_extra = null) =>
    req('POST', `/agentes/${nombre}/conversar`, { mensaje, historial, contexto_extra }),
  agentesHistorial: (params = '') => req('GET', `/agentes/historial/invocaciones${params}`),
  agentesCostos: (dias = 30) => req('GET', `/agentes/historial/costos?dias=${dias}`),

  // ══ Vendedor IA ═════════════════════════════════════════
  vendedorDashboard: () => req('GET', '/vendedor-ia/dashboard'),
  vendedorConversaciones: (params = '') => req('GET', `/vendedor-ia/conversaciones${params}`),
  vendedorConversacion: (id) => req('GET', `/vendedor-ia/conversaciones/${id}`),
  vendedorEnviarMensaje: (convId, contenido) => req('POST', `/vendedor-ia/conversaciones/${convId}/mensaje`, { contenido }),
  vendedorCambiarEstadoConv: (id, estado, notas) => req('PUT', `/vendedor-ia/conversaciones/${id}/estado`, { estado, notas }),
  vendedorReenviarLead: (leadId) => req('POST', `/vendedor-ia/leads/${leadId}/reenviar`),
  vendedorProcesarDrip: () => req('POST', '/vendedor-ia/drip/procesar'),
  vendedorConfig: () => req('GET', '/vendedor-ia/configuracion'),
  vendedorGuardarConfig: (body) => req('PUT', '/vendedor-ia/configuracion', body),

  // ══ Asignador IA ════════════════════════════════════════
  asignadorDashboard: () => req('GET', '/asignador-ia/dashboard'),
  asignadorSugerir: (viajeId) => req('POST', `/asignador-ia/sugerir/${viajeId}`),
  asignadorAplicar: (id) => req('POST', `/asignador-ia/${id}/aplicar`),
  asignadorRechazar: (id, motivo) => req('POST', `/asignador-ia/${id}/rechazar`, { motivo }),
  asignadorHistorial: (params = '') => req('GET', `/asignador-ia/historial${params}`),
  asignadorDetalle: (id) => req('GET', `/asignador-ia/${id}`),
  asignadorReNotificar: (id) => req('POST', `/asignador-ia/${id}/notificar`),
  asignadorConfig: () => req('GET', '/asignador-ia/configuracion/get'),
  asignadorGuardarConfig: (body) => req('PUT', '/asignador-ia/configuracion/set', body),

  // ══ Retención IA ════════════════════════════════════════
  retencionDashboard: () => req('GET', '/retencion-ia/dashboard'),
  retencionSegmento: (clasif) => req('GET', `/retencion-ia/segmentos/${clasif}`),
  retencionAcciones: (params = '') => req('GET', `/retencion-ia/acciones${params}`),
  retencionAccionDetalle: (id) => req('GET', `/retencion-ia/acciones/${id}`),
  retencionCorrerCiclo: (soloScoring = false) => req('POST', '/retencion-ia/correr-ciclo', { solo_scoring: soloScoring }),
  retencionAccionManual: (clienteId, body) => req('POST', `/retencion-ia/cliente/${clienteId}/accion`, body),
  retencionConfig: () => req('GET', '/retencion-ia/configuracion'),
  retencionGuardarConfig: (body) => req('PUT', '/retencion-ia/configuracion', body),

  // ══ Atracción IA ════════════════════════════════════════
  atraccionDashboard: () => req('GET', '/atraccion-ia/dashboard'),
  atraccionTracking: (body) => req('POST', '/atraccion-ia/tracking/visita', body),
  atraccionContenidoList: (params = '') => req('GET', `/atraccion-ia/contenido${params}`),
  atraccionContenidoDetalle: (id) => req('GET', `/atraccion-ia/contenido/${id}`),
  atraccionGenerar: (tipo, tema) => req('POST', '/atraccion-ia/contenido/generar', { tipo, tema }),
  atraccionAprobar: (id) => req('PUT', `/atraccion-ia/contenido/${id}/aprobar`),
  atraccionPublicar: (id, url) => req('PUT', `/atraccion-ia/contenido/${id}/publicar`, { url_publicado: url }),
  atraccionRechazar: (id, motivo) => req('PUT', `/atraccion-ia/contenido/${id}/rechazar`, { motivo }),
  atraccionEditar: (id, body) => req('PUT', `/atraccion-ia/contenido/${id}`, body),
  atraccionCorrerCiclo: () => req('POST', '/atraccion-ia/correr-ciclo'),
  atraccionCampanas: () => req('GET', '/atraccion-ia/campanas'),
  atraccionCrearCampana: (body) => req('POST', '/atraccion-ia/campanas', body),
  atraccionActualizarCampana: (id, body) => req('PUT', `/atraccion-ia/campanas/${id}`, body),
  atraccionConfig: () => req('GET', '/atraccion-ia/configuracion'),
  atraccionGuardarConfig: (body) => req('PUT', '/atraccion-ia/configuracion', body),

  // ══ Auditor IA ══════════════════════════════════════════
  auditorDashboard: () => req('GET', '/auditor-ia/dashboard'),
  auditorEjecuciones: () => req('GET', '/auditor-ia/ejecuciones'),
  auditorEjecucion: (id) => req('GET', `/auditor-ia/ejecuciones/${id}`),
  auditorHallazgos: (params = '') => req('GET', `/auditor-ia/hallazgos${params}`),
  auditorEjecutar: () => req('POST', '/auditor-ia/ejecutar'),
  auditorCambiarStatus: (id, status, notas) => req('PUT', `/auditor-ia/hallazgos/${id}/status`, { status, notas }),
  auditorConfig: () => req('GET', '/auditor-ia/configuracion'),
  auditorGuardarConfig: (body) => req('PUT', '/auditor-ia/configuracion', body),

  // ══ CFDI 4.0 + Carta Porte 3.0 ═════════════════════════
  cfdiDashboard: () => req('GET', '/cfdi/dashboard'),
  cfdiList: (params = '') => req('GET', `/cfdi${params}`),
  cfdiDetalle: (id) => req('GET', `/cfdi/${id}`),
  cfdiEmitirViaje: (viajeId) => req('POST', `/cfdi/emitir-viaje/${viajeId}`),
  cfdiReintentar: (id) => req('POST', `/cfdi/${id}/reintentar`),
  cfdiEnviarCliente: (id) => req('POST', `/cfdi/${id}/enviar-cliente`),
  cfdiCancelar: (id, body) => req('POST', `/cfdi/${id}/cancelar`, body),
  cfdiPdfUrl: (id) => fileUrl(`/cfdi/${id}/pdf`),
  cfdiXmlUrl: (id) => fileUrl(`/cfdi/${id}/xml`),
  cfdiConfigEmpresa: () => req('GET', '/cfdi/configuracion/empresa'),
  cfdiGuardarConfig: (body) => req('PUT', '/cfdi/configuracion/empresa', body),
};
