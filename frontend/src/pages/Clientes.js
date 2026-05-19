import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const REGIMENES = [
  { v: '601', l: '601 — General de Ley Personas Morales' },
  { v: '612', l: '612 — PFAE Personas Físicas con Actividades Empresariales' },
  { v: '603', l: '603 — Personas Morales con Fines no Lucrativos' },
  { v: '626', l: '626 — RESICO Personas Morales' },
];

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [filtro, setFiltro] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.clientes();
      setClientes(r || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const clientesFiltrados = clientes.filter(c =>
    !filtro || (c.nombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (c.rfc_fiscal || '').toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>👥 Clientes</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Empresas que operan con VIVO. Datos fiscales para emisión CFDI.
          </p>
        </div>
        <button onClick={() => setCreando(true)} className="btn btn-primary">+ Agregar cliente</button>
      </div>

      {error && <div className="alert red" style={{ marginBottom: 16 }}><div className="alert-dot"/><div>{error}</div></div>}

      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Buscar por nombre o RFC..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading ? (
        <div className="empty">Cargando clientes...</div>
      ) : clientesFiltrados.length === 0 ? (
        <div style={{ background: '#fff', border: '2px dashed #e5e7eb', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <h3 style={{ margin: '0 0 6px' }}>Sin clientes todavía</h3>
          <p style={{ color: '#6b7280', fontSize: 14, maxWidth: 500, margin: '0 auto 16px' }}>
            Cuando un lead se convierta en cliente, aparecerá aquí. También puedes agregar manualmente.
          </p>
          <button onClick={() => setCreando(true)} className="btn btn-primary">+ Agregar primer cliente</button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={th}>Cliente</th>
                <th style={th}>RFC</th>
                <th style={th}>Régimen</th>
                <th style={th}>Contacto</th>
                <th style={th}>Tipo</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                    {c.razon_social && <div style={{ fontSize: 11, color: '#6b7280' }}>{c.razon_social}</div>}
                  </td>
                  <td style={td}><code style={{ fontSize: 11 }}>{c.rfc_fiscal || '—'}</code></td>
                  <td style={td}>{c.regimen_fiscal || '—'}</td>
                  <td style={td}>
                    <div style={{ fontSize: 12 }}>{c.email || '—'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{c.telefono || '—'}</div>
                  </td>
                  <td style={td}>{c.tipo || '—'}</td>
                  <td style={td}>
                    <button onClick={() => setEditando(c)} className="btn btn-ghost btn-sm">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creando || editando) && (
        <ModalCliente
          cliente={editando}
          onClose={() => { setCreando(false); setEditando(null); }}
          onGuardado={() => { setCreando(false); setEditando(null); cargar(); }}
        />
      )}
    </div>
  );
}

function ModalCliente({ cliente, onClose, onGuardado }) {
  const [form, setForm] = useState(cliente || {
    nombre: '', empresa: '', rfc_fiscal: '', razon_social: '',
    regimen_fiscal: '601', codigo_postal_fiscal: '', uso_cfdi: 'G03',
    email: '', email_facturacion: '', telefono: '', tipo: 'empresa', notas: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const guardar = async () => {
    if (!form.nombre?.trim()) { setError('Nombre requerido'); return; }
    setGuardando(true); setError(null);
    try {
      if (cliente?.id) await api.actualizarCliente(cliente.id, form);
      else await api.crearCliente(form);
      onGuardado();
    } catch (e) { setError(e.message); } finally { setGuardando(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, maxWidth: 640, width: '100%', padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
        <h2 style={{ margin: '0 0 14px' }}>{cliente ? 'Editar cliente' : '+ Nuevo cliente'}</h2>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Nombre / Contacto *</label>
            <input type="text" value={form.nombre || ''} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Empresa</label>
            <input type="text" value={form.empresa || ''} onChange={e => setForm({ ...form, empresa: e.target.value })} />
          </div>
        </div>

        <h4 style={{ margin: '14px 0 8px', fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>📄 Datos fiscales</h4>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">RFC</label>
            <input type="text" value={form.rfc_fiscal || ''} onChange={e => setForm({ ...form, rfc_fiscal: e.target.value.toUpperCase() })} placeholder="XAXX010101000" />
          </div>
          <div className="form-group">
            <label className="form-label">CP fiscal</label>
            <input type="text" value={form.codigo_postal_fiscal || ''} onChange={e => setForm({ ...form, codigo_postal_fiscal: e.target.value })} placeholder="06600" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Razón social</label>
          <input type="text" value={form.razon_social || ''} onChange={e => setForm({ ...form, razon_social: e.target.value })} placeholder="CONSTRUCTORA ABC SA DE CV" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Régimen fiscal</label>
            <select value={form.regimen_fiscal || '601'} onChange={e => setForm({ ...form, regimen_fiscal: e.target.value })}>
              {REGIMENES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Uso CFDI</label>
            <select value={form.uso_cfdi || 'G03'} onChange={e => setForm({ ...form, uso_cfdi: e.target.value })}>
              <option value="G03">G03 — Gastos en general</option>
              <option value="G01">G01 — Adquisición de mercancías</option>
              <option value="S01">S01 — Sin efectos fiscales</option>
            </select>
          </div>
        </div>

        <h4 style={{ margin: '14px 0 8px', fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>📞 Contacto</h4>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Email facturación</label>
            <input type="email" value={form.email_facturacion || ''} onChange={e => setForm({ ...form, email_facturacion: e.target.value })} placeholder="(opcional, si diferente)" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Teléfono / WhatsApp</label>
            <input type="tel" value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <select value={form.tipo || 'empresa'} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option value="empresa">Empresa</option>
              <option value="constructora">Constructora</option>
              <option value="industria">Industria</option>
              <option value="broker_socio">Broker socio</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notas internas</label>
          <textarea rows={2} value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} />
        </div>

        {error && <div className="alert red" style={{ marginBottom: 10 }}><div className="alert-dot"/><div>{error}</div></div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={guardar} disabled={guardando} className="btn btn-primary">
            {guardando ? 'Guardando...' : (cliente ? 'Guardar cambios' : 'Crear cliente')}
          </button>
          <button onClick={onClose} className="btn btn-ghost">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

const th = { padding: '10px 12px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', textAlign: 'left', fontWeight: 700 };
const td = { padding: '10px 12px' };
