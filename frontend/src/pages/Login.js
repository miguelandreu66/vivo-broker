import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await login(email, password);
      // Si es la primera vez (o no completó onboarding), enviarlo al wizard
      const onboardingDone = localStorage.getItem('vivo_onboarding_done') === '1';
      navigate(onboardingDone ? '/' : '/onboarding');
    } catch (e) {
      setError(e.message || 'Credenciales inválidas');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a1a 100%)',
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 36,
            fontWeight: 900,
            color: '#fff',
            boxShadow: '0 8px 24px rgba(255,107,53,0.4)',
          }}>V</div>
          <h1 style={{
            fontSize: 36,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #FF6B35 0%, #FFB627 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.05em',
            margin: 0,
          }}>VIVO</h1>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>
            Brokerage de Urgencias Logísticas
          </p>
          <p style={{ fontSize: 13, color: '#FF6B35', marginTop: 8, fontStyle: 'italic', fontWeight: 600 }}>
            Tu carga, VIVO.
          </p>
        </div>

        {error && (
          <div className="alert red" style={{ marginBottom: 16 }}>
            <div className="alert-dot" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@vivocargo.com" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Entrar a VIVO'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 24, letterSpacing: '0.05em' }}>
          VIVO · Sistema interno · Uso exclusivo del personal autorizado
        </p>
      </div>
    </div>
  );
}
