import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// ── Service Worker (PWA) ──────────────────────────────────────
// Solo en producción y con soporte del navegador
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('[VIVO] Service worker registrado:', reg.scope);
        // Detectar actualización
        reg.addEventListener('updatefound', () => {
          const nuevo = reg.installing;
          if (nuevo) {
            nuevo.addEventListener('statechange', () => {
              if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[VIVO] Nueva versión disponible. Recarga para actualizar.');
              }
            });
          }
        });
      })
      .catch((err) => console.warn('[VIVO] No se pudo registrar SW:', err));
  });
}
