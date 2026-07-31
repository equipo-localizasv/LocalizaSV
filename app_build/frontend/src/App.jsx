import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './services/api';
import socketService from './services/socket';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateCase from './pages/CreateCase';
import CaseDetail from './pages/CaseDetail';
import ModeratorPanel from './pages/ModeratorPanel';

export const AuthContext = createContext(null);

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          // Requisito 23: Conectar al WebSocket cuando hay sesión activa
          socketService.connect(token);
        } catch (error) {
          console.error('Error auto-login user:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // Efecto para gestionar conexión/desconexión y Toast en tiempo real
  useEffect(() => {
    // Escuchar el evento 'nueva_alerta' para notificaciones Toast (Requisito 27)
    const unsubscribe = socketService.on('nueva_alerta', (alertData) => {
      console.log('🚨 [App] Evento "nueva_alerta" recibido:', alertData);
      const toastId = Date.now() + Math.random();
      const newToast = {
        id: toastId,
        alerta: alertData,
        created_at: new Date()
      };

      setToasts((prevToasts) => [newToast, ...prevToasts].slice(0, 5));

      // Descartar automáticamente tras 7 segundos
      setTimeout(() => {
        setToasts((prevToasts) => prevToasts.filter((t) => t.id !== toastId));
      }, 7000);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    // Requisito 23: Conectar al servidor WebSocket al iniciar sesión
    socketService.connect(token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    // Desconectar socket al salir
    socketService.disconnect();
    setUser(null);
  };

  const removeToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', backgroundColor: '#090d16', color: '#f3f4f6' }}>
        <div style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#9ca3af' }}>Cargando portal...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      <Router>
        <div className="app-container">
          <Navbar />
          <div className="content-wrap">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route 
                path="/login" 
                element={!user ? <Login /> : <Navigate to="/" replace />} 
              />
              <Route 
                path="/register" 
                element={!user ? <Register /> : <Navigate to="/" replace />} 
              />
              <Route 
                path="/reportar" 
                element={user ? <CreateCase /> : <Navigate to="/login" replace />} 
              />
              <Route path="/caso/:id" element={<CaseDetail />} />
              <Route path="/moderacion" element={<ModeratorPanel />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          {/* Notificaciones flotantes Toast en tiempo real */}
          <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </div>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;

