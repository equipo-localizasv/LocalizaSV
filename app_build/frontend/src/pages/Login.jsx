import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../App';
import { X, Info, Phone, Lock, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para Modal de Recuperación de Contraseña (según diseño mockup enviado)
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Solicitar código SMS, 2: Ingresar código y nueva contraseña
  const [recoveryPhone, setRecoveryPhone] = useState('+503 7890-1284');
  const [recoveryMasked, setRecoveryMasked] = useState('+503 ********84');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, complete todos los campos.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, usuario } = response.data;
      login(token, usuario);
      if (usuario?.rol === 'moderador' || usuario?.rol === 'administrador') {
        navigate('/moderacion');
      } else if (usuario?.rol === 'autoridad') {
        navigate('/autoridades');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  // Solicitar código SMS
  const handleRequestRecovery = async () => {
    setRecoveryError('');
    setRecoveryLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { telefono: recoveryPhone });
      setRecoveryMasked(res.data.telefonoMasked || recoveryPhone);
      if (res.data.codigoGenerado) {
        setRecoveryCode(res.data.codigoGenerado);
      }
      setRecoveryStep(2);
    } catch (err) {
      // Fallback para permitir prueba fluida si no existe en mock
      setRecoveryMasked('+503 ********84');
      setRecoveryCode('849201');
      setRecoveryStep(2);
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Confirmar cambio de contraseña
  const handleConfirmReset = async (e) => {
    if (e) e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    if (!recoveryCode.trim()) {
      setRecoveryError('Por favor ingrese el código de verificación recibido por SMS.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setRecoveryError('Ingrese una contraseña segura de al menos 6 caracteres.');
      return;
    }

    setRecoveryLoading(true);
    try {
      await api.post('/auth/reset-password', {
        telefono: recoveryPhone,
        codigo: recoveryCode,
        nueva_password: newPassword
      });
      setRecoverySuccess('¡Contraseña restablecida exitosamente! Ya puede ingresar con su nueva clave.');
      setPassword(newPassword);
      setTimeout(() => {
        setRecoveryOpen(false);
        setRecoveryStep(1);
        setRecoverySuccess('');
      }, 2000);
    } catch (err) {
      setRecoveryError(err.response?.data?.error || 'Error al validar el código o restablecer contraseña.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="auth-wrapper glass-panel animate-fade-in" style={{ position: 'relative' }}>
      <div className="auth-header">
        <h2>Bienvenido</h2>
        <p>Inicie sesión en el Sistema Nacional LocalizaSV</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {/* Selector Rápido de Cuentas de Acceso (Administrador / Moderación / PNC) */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>
          Acceso rápido por rol:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
          <button
            type="button"
            onClick={() => {
              setEmail('mvanegasjdaniel@gmail.com');
              setPassword('Password123!');
            }}
            style={{
              padding: '0.45rem 0.3rem',
              borderRadius: '6px',
              border: email === 'mvanegasjdaniel@gmail.com' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
              background: email === 'mvanegasjdaniel@gmail.com' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.04)',
              color: '#f87171',
              fontSize: '0.73rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            👑 Administrador
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail('operaciones.c4i@pnc.gob.sv');
              setPassword('Password123!');
            }}
            style={{
              padding: '0.45rem 0.3rem',
              borderRadius: '6px',
              border: email === 'operaciones.c4i@pnc.gob.sv' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
              background: email === 'operaciones.c4i@pnc.gob.sv' ? 'rgba(192, 132, 252, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: '#c084fc',
              fontSize: '0.73rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🟣 Moderador
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail('pulsarrss630@gmail.com');
              setPassword('Password123!');
            }}
            style={{
              padding: '0.45rem 0.3rem',
              borderRadius: '6px',
              border: email === 'pulsarrss630@gmail.com' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
              background: email === 'pulsarrss630@gmail.com' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: '#38bdf8',
              fontSize: '0.73rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🚨 Autoridad/PNC
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Correo Electrónico</label>
          <input
            id="email"
            type="email"
            className="form-control"
            placeholder="nombre@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="password">Contraseña</label>
            <button
              type="button"
              onClick={() => {
                setRecoveryOpen(true);
                setRecoveryError('');
                setRecoverySuccess('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '0 0 0.25rem 0',
                textDecoration: 'underline'
              }}
            >
              ¿Olvidó su contraseña?
            </button>
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            className="form-control"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{ paddingRight: '40px' }}
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            style={{ 
              position: 'absolute', 
              right: '10px', 
              bottom: '10px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '1.2rem', 
              color: 'var(--text-muted)' 
            }}
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <button type="submit" className="btn btn-primary w-100 mt-4" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Ingresar'}
        </button>
      </form>

      <div className="auth-footer">
        ¿No tiene una cuenta? <Link to="/register">Regístrese aquí</Link>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE RECUPERACIÓN DE CONTRASEÑA (RÉPLICA EXACTA DEL MOCKUP VISUAL)   */}
      {/* ========================================================================= */}
      {recoveryOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            color: '#1e293b',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '430px',
            padding: '2rem 1.75rem',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}>
            {/* Botón Cerrar (X) */}
            <button
              type="button"
              onClick={() => setRecoveryOpen(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
            >
              <X size={22} strokeWidth={2} />
            </button>

            {/* Título Principal */}
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#1e293b',
              textAlign: 'center',
              margin: '0 0 1.25rem 0'
            }}>
              Recuperación de contraseña
            </h3>

            {/* Cuadro de Información (Gris suave con icono de información) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                color: '#64748b',
                marginTop: '2px',
                flexShrink: 0
              }}>
                <Info size={18} strokeWidth={2.2} />
              </div>
              <p style={{
                margin: 0,
                fontSize: '0.82rem',
                lineHeight: '1.35',
                color: '#475569'
              }}>
                Se envió a su teléfono un mensaje de texto con un código de confirmación para la recuperación de la contraseña.
              </p>
            </div>

            {/* Alertas de error / éxito */}
            {recoveryError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoverySuccess && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={16} />
                <span>{recoverySuccess}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleConfirmReset}>
              {/* Campo: Tu número de teléfono */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginBottom: '0.4rem',
                  fontWeight: 500
                }}>
                  Tu número de teléfono
                </label>
                <input
                  type="text"
                  value={recoveryStep === 1 ? recoveryPhone : recoveryMasked}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  placeholder="+503 7890-1284"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#334155',
                    fontFamily: 'monospace',
                    letterSpacing: '0.04em',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Campo: Código de verificación */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginBottom: '0.4rem',
                  fontWeight: 500
                }}>
                  Código de verificación
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="Ej: 849201"
                  maxLength={8}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    color: '#0f172a',
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Campo: Nueva Contraseña */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginBottom: '0.4rem',
                  fontWeight: 500
                }}>
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Escriba su nueva contraseña"
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Botón Azul Primario: "Confirmar cambio de contraseña" */}
              <button
                type="submit"
                disabled={recoveryLoading}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: '#0084ff',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: recoveryLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 132, 255, 0.35)',
                  transition: 'background 0.2s ease',
                  outline: 'none'
                }}
              >
                {recoveryLoading ? 'Procesando...' : 'Confirmar cambio de contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
