import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { getServerBaseUrl } from '../services/api';
import RegisterCommunityCameraModal from './RegisterCommunityCameraModal';
import { 
  Shield,
  Camera, 
  Search, 
  PlusCircle, 
  User, 
  LogOut, 
  Video, 
  FileText, 
  Radio, 
  Bell, 
  Activity, 
  CheckCircle2, 
  Clock,
  Sparkles
} from 'lucide-react';

const Navbar = () => {
  const [communityCamOpen, setCommunityCamOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${getServerBaseUrl()}${path}`;
  };

  const userRole = user?.rol || 'ciudadano';

  const roleConfig = {
    administrador: {
      label: '👑 Administrador General',
      badgeStyle: {
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        color: '#f87171'
      },
      homePath: '/moderacion'
    },
    moderador: {
      label: 'Operador / Moderador',
      badgeStyle: {
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        color: '#60a5fa'
      },
      homePath: '/moderacion'
    },
    autoridad: {
      label: 'Agente PNC / Fiscalía',
      badgeStyle: {
        background: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        color: '#fbbf24'
      },
      homePath: '/autoridades'
    },
    ciudadano: {
      label: 'Ciudadano',
      badgeStyle: {
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        color: '#34d399'
      },
      homePath: '/'
    }
  };

  const currentRole = roleConfig[userRole] || roleConfig.ciudadano;
  const brandHome = user ? currentRole.homePath : '/';

  const [clock, setClock] = useState(
    new Date().toLocaleTimeString('es-SV', { hour12: false })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('es-SV', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-container" style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(10, 15, 29, 0.94)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* Brand & Official Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to={brandHome} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            textDecoration: 'none'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
            }}>
              <Shield size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.2rem',
                fontWeight: '800',
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                Localiza<span style={{ color: '#38bdf8' }}>SV</span>
              </div>
              <div style={{
                fontSize: '0.68rem',
                color: '#94a3b8',
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}>
                Sistema Nacional de Búsqueda • El Salvador
              </div>
            </div>
          </Link>

          {/* Institutional Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.72rem',
            color: '#cbd5e1'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }} />
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Servidor Activo</span>
            <span style={{ color: '#475569' }}>•</span>
            <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>
              {clock} UTC-6
            </span>
          </div>
        </div>

        {/* Navigation Menu by Role */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {user ? (
            <>
              {/* Ciudadano Nav Links */}
              {userRole === 'ciudadano' && (
                <>
                  <Link
                    to="/"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: 500,
                      color: isActive('/') ? '#38bdf8' : '#cbd5e1',
                      background: isActive('/') ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                      border: isActive('/') ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Search size={16} />
                    <span>Casos Activos</span>
                  </Link>
                  <Link
                    to="/reportar"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <PlusCircle size={16} />
                    <span>Reportar Desaparición</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setCommunityCamOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: '#34d399',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Camera size={16} />
                    <span>Registrar Mi Cámara</span>
                  </button>
                </>
              )}

              {/* Moderador y Administrador Nav Links */}
              {(userRole === 'moderador' || userRole === 'administrador') && (
                <>
                  <Link
                    to="/moderacion"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: isActive('/moderacion') ? '#38bdf8' : '#cbd5e1',
                      background: isActive('/moderacion') ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      textDecoration: 'none'
                    }}
                  >
                    <Video size={16} />
                    <span>Centro de Monitoreo & Control</span>
                  </Link>

                  <Link
                    to="/reportar"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    <PlusCircle size={16} />
                    <span>Registrar Expediente</span>
                  </Link>

                  <Link
                    to="/"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: 500,
                      color: isActive('/') ? '#38bdf8' : '#cbd5e1',
                      background: isActive('/') ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                      textDecoration: 'none'
                    }}
                  >
                    <Search size={16} />
                    <span>Portal Ciudadano</span>
                  </Link>
                </>
              )}

              {/* Autoridad Nav Links */}
              {userRole === 'autoridad' && (
                <>
                  <Link
                    to="/autoridades"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      color: isActive('/autoridades') ? '#fbbf24' : '#cbd5e1',
                      background: isActive('/autoridades') ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      textDecoration: 'none'
                    }}
                  >
                    <Radio size={16} />
                    <span>Comando Táctico PNC</span>
                  </Link>
                </>
              )}

              {/* Perfil & Usuario */}
              <Link
                to="/perfil"
                title="Ver mi perfil"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textDecoration: 'none'
                }}
              >
                <img
                  src={getImageUrl(user.selfie_url)}
                  alt={user.nombre}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid #38bdf8'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=85';
                  }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9' }}>
                  {user.nombre?.split(' ')[0]}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  ...currentRole.badgeStyle
                }}>
                  {currentRole.label}
                </span>
              </Link>

              {/* Botón Salir */}
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = '#f87171';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <LogOut size={15} />
                <span>Salir</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/"
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.86rem',
                  fontWeight: 500,
                  color: '#cbd5e1',
                  textDecoration: 'none'
                }}
              >
                Casos Activos
              </Link>
              <Link
                to="/login"
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.86rem',
                  fontWeight: 500,
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  textDecoration: 'none'
                }}
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                }}
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
      <RegisterCommunityCameraModal
        isOpen={communityCamOpen}
        onClose={() => setCommunityCamOpen(false)}
        user={user}
      />
    </header>
  );
};

export default Navbar;
