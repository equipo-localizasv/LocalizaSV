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

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🔍 <span>LocalizaSV</span>
      </Link>
      <div className="navbar-menu">
        <Link to="/" className="navbar-item">
          Dashboard
        </Link>
        {user ? (
          <>
            <Link to="/reportar" className="navbar-item">
              Reportar Caso
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
            </div>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Salir
            </button>
          </>
        ) : (
          <>
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
