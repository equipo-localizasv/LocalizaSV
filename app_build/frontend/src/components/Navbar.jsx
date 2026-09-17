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

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link to={brandHome} className="navbar-brand">
          🔍 <span>LocalizaSV</span>
        </Link>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '0.2rem 0.6rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          color: '#34d399',
          fontWeight: '600'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#10b981', 
            boxShadow: '0 0 8px #10b981',
            display: 'inline-block' 
          }}></span>
          <span>Red Nacional Operativa</span>
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

