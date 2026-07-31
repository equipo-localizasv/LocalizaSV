import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../App';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // Empty = All, 'Desaparecido', 'Encontrado'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.estado = statusFilter;

      const response = await api.get('/cases', { params });
      setCases(response.data);
    } catch (err) {
      console.error('Error fetching cases:', err);
      setError('No se pudieron cargar los casos. Intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search input slightly or trigger on search/filter update
    const timer = setTimeout(() => {
      fetchCases();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const [fcmToken, setFcmToken] = useState('');
  const [regStatus, setRegStatus] = useState('');

  const handleSimulateFcmRegister = async () => {
    setRegStatus('Registrando...');
    try {
      const mockToken = `mock-fcm-token-${user ? user.id : 'anon'}-${Math.floor(Math.random() * 100000)}`;
      await api.post('/notifications/register-token', { token: mockToken });
      setFcmToken(mockToken);
      setRegStatus('¡Token registrado en la BD!');
    } catch (err) {
      console.error(err);
      setRegStatus('Error al registrar token de simulación.');
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    return `http://localhost:3001${path}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Casos de Desaparición</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Plataforma solidaria para el reporte y búsqueda de personas en El Salvador</p>
        </div>
        {user ? (
          <Link to="/reportar" className="btn btn-primary">
            ➕ Reportar Desaparición
          </Link>
        ) : (
          <Link to="/login" className="btn btn-secondary">
            Iniciar sesión para reportar
          </Link>
        )}
      </div>

      {user && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed var(--primary)' }}>
          <div>
            <h4 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📲 Simulador de Notificaciones Push (FCM)
            </h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Registra este navegador como un dispositivo para recibir alertas simuladas del sistema.
            </p>
            {fcmToken && (
              <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                Token: {fcmToken}
              </code>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <button onClick={handleSimulateFcmRegister} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              🔔 Registrar Dispositivo Mock
            </button>
            {regStatus && <span style={{ fontSize: '0.75rem', color: regStatus.includes('¡') ? 'var(--success)' : 'var(--text-secondary)' }}>{regStatus}</span>}
          </div>
        </div>
      )}

      <div className="filters-bar glass-panel" style={{ padding: '1rem', marginBottom: '2rem' }}>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setStatusFilter('')} 
            className={`btn ${statusFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Todos
          </button>
          <button 
            onClick={() => setStatusFilter('Desaparecido')} 
            className={`btn ${statusFilter === 'Desaparecido' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Desaparecidos
          </button>
          <button 
            onClick={() => setStatusFilter('Encontrado')} 
            className={`btn ${statusFilter === 'Encontrado' ? 'btn-success' : 'btn-secondary'}`}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Localizados
          </button>
        </div>
      </div>

      {error && <div className="auth-error text-center">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Buscando registros...</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3>No se encontraron reportes</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            No hay casos registrados que coincidan con sus criterios de búsqueda.
          </p>
        </div>
      ) : (
        <div className="cases-grid">
          {cases.map((caso) => (
            <div key={caso.id} className="case-card glass-panel animate-fade-in">
              <div className="case-card-img-wrapper">
                <img 
                  src={getImageUrl(caso.foto_url)} 
                  alt={caso.nombre_desaparecido} 
                  className="case-card-img"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80';
                  }}
                />
                <span className={`status-badge ${caso.estado.toLowerCase()}`}>
                  {caso.estado}
                </span>
              </div>
              <div className="case-card-body">
                <h3 className="case-card-title">{caso.nombre_desaparecido}</h3>
                <div className="case-card-meta">
                  <div><strong>Edad:</strong> {caso.edad} años</div>
                  <div><strong>Género:</strong> {caso.genero}</div>
                  <div><strong>Visto el:</strong> {formatDate(caso.fecha_desaparicion)}</div>
                  <div style={{ color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    📍 {caso.ubicacion_desaparicion}
                  </div>
                </div>
                <p className="case-card-desc">{caso.descripcion}</p>
                <div className="case-card-footer">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Por: {caso.creador_nombre.split(' ')[0]}
                  </span>
                  <Link to={`/caso/${caso.id}`} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    Ver Detalle
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
