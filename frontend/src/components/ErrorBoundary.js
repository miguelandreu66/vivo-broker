import React from 'react';

// ════════════════════════════════════════════════════════════════
// VIVO — Error Boundary global
// Captura errores de React y muestra pantalla amigable
// ════════════════════════════════════════════════════════════════

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    // En el futuro mandar a Sentry
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: "Inter, sans-serif",
        }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🚨</div>
            <h1 style={{ fontSize: 32, margin: '0 0 12px', background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Algo se rompió en VIVO
            </h1>
            <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
              Hubo un error inesperado en la interfaz. No te preocupes, tus datos están a salvo.
            </p>
            <details style={{
              textAlign: 'left',
              background: 'rgba(255,107,53,0.1)',
              border: '1px solid #FF6B35',
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              marginBottom: 20,
              color: '#FFB627',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Detalle técnico</summary>
              <pre style={{ overflow: 'auto', marginTop: 8, color: '#fff', fontFamily: 'monospace' }}>
                {this.state.error?.message || 'Error desconocido'}
              </pre>
            </details>
            <button onClick={() => window.location.href = '/'}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #E55822 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}>
              ⚡ Recargar VIVO
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
