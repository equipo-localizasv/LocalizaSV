import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Convert upload path to full backend URL
  const getImageUrl = (path) => {
    if (!path) return '';
    return `http://localhost:3001${path}`;
  };

  const userRole = user?.rol || 'ciudadano';

  const roleConfig = {
    moderador: {
      label: 'Moderador',
      icon: '👨‍✈️',
      badgeClass: 'role-chip-moderador',
      homePath: '/moderacion'
    },
    autoridad: {
      label: 'Autoridad',
      icon: '👮',
      badgeClass: 'role-chip-autoridad',
      homePath: '/autoridades'
    },
    ciudadano: {
      label: 'Ciudadano',
      icon: '👤',
      badgeClass: 'role-chip-ciudadano',
      homePath: '/'
    }
  };

  const currentRole = roleConfig[userRole] || roleConfig.ciudadano;
  const brandHome = user ? currentRole.homePath : '/';

  const [clock, setClock] = React.useState(new Date().toLocaleTimeString('es-SV', { hour12: false }));
  React.useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString('es-SV', { hour12: false })), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <nav className="navbar" style={{
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 240, 255, 0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link to={brandHome} className="navbar-brand" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.25rem',
          fontWeight: '800',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #00f0ff 0%, #38bdf8 50%, #818cf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          <span>🛡️</span>
          <span>LocalizaSV</span>
          <span style={{
            fontSize: '0.65rem',
            padding: '0.1rem 0.4rem',
            borderRadius: '4px',
            background: 'rgba(0, 240, 255, 0.15)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: '#38bdf8',
            fontFamily: 'monospace',
            fontWeight: '700',
            letterSpacing: '0.05em',
            WebkitTextFillColor: '#38bdf8'
          }}>
            CYBER-DEFENSE
          </span>
        </Link>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(11, 19, 43, 0.7)',
          border: '1px solid rgba(0, 255, 157, 0.3)',
          padding: '0.25rem 0.7rem',
          borderRadius: '20px',
          fontSize: '0.72rem',
          color: '#00ff9d',
          fontWeight: '700',
          fontFamily: 'monospace'
        }}>
          <span className="cyber-beacon" style={{ background: '#00ff9d' }}></span>
          <span>DEF-SYS ONLINE</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span style={{ color: '#38bdf8' }}>{clock}</span>
        </div>
      </div>
      <div className="navbar-menu">
        {user ? (
          <>
            {/* Vistas exclusivas según el rol */}
            {userRole === 'moderador' && (
              <Link to="/moderacion" className="navbar-item">
                Panel de Moderación
              </Link>
            )}

            {userRole === 'autoridad' && (
              <Link to="/autoridades" className="navbar-item">
                Centro de Operaciones
              </Link>
            )}

            {userRole === 'ciudadano' && (
              <>
                <Link to="/" className="navbar-item">
                  Dashboard
                </Link>
                <Link to="/reportar" className="navbar-item">
                  Reportar Caso
                </Link>
              </>
            )}

            <Link to="/perfil" className="navbar-item">
              Mi Perfil
            </Link>

            <div className="user-badge">
              <img 
                src={getImageUrl(user.selfie_url)} 
                alt={user.nombre} 
                className="user-avatar"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=85';
                }}
              />
              <span className="user-name">{user.nombre.split(' ')[0]}</span>
              <span className={`role-chip ${currentRole.badgeClass}`}>
                <span>{currentRole.icon}</span>
                <span>{currentRole.label}</span>
              </span>
            </div>

            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Salir
            </button>
          </>
        ) : (
          <>
            <Link to="/" className="navbar-item">
              Dashboard
            </Link>
            <Link to="/login" className="navbar-item">
              Iniciar Sesión
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              Registrarse
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

