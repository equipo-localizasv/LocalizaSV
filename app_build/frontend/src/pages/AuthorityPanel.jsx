import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import MapaAlertas from '../components/MapaAlertas';

const AuthorityPanel = () => {
  const [alerts, setAlerts] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros de Fecha y Estado
  const [dateFilter, setDateFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [alertsRes, casesRes] = await Promise.all([
        api.get('/alertas/activas'),
        api.get('/cases').catch(() => ({ data: [] }))
      ]);
      setAlerts(alertsRes.data || []);
      setCases(casesRes.data || []);
    } catch (err) {
      console.error('Error fetching data for AuthorityPanel:', err);
      setError('No se pudieron cargar las alertas ni las estadísticas. Intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cálculo de Estadísticas Superiores (Cards)
  const stats = useMemo(() => {
    const activeAlerts = alerts.length;

    // Casos en curso: estado "Desaparecido" o sin resolver
    const casesInProgress = cases.filter(
      (c) => (c.estado || '').toLowerCase() === 'desaparecido' || (c.estado || '').toLowerCase() === 'en curso'
    ).length;

    // Casos resueltos: estado "Encontrado" o "Resuelto"
    const casesResolved = cases.filter(
      (c) => (c.estado || '').toLowerCase() === 'encontrado' || (c.estado || '').toLowerCase() === 'resuelto'
    ).length;

    return {
      activeAlerts,
      casesInProgress,
      casesResolved
    };
  }, [alerts, cases]);

  // Filtrado dinámico de Alertas para Tabla y Mapa
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alerta) => {
      // 1. Filtro por Fecha (últimas 24 horas, última semana, último mes, todas)
      let matchesDate = true;
      if (dateFilter !== 'todas') {
        const dateStr = alerta.fecha_deteccion || alerta.created_at;
        if (!dateStr) {
          matchesDate = false;
        } else {
          const alertTime = new Date(dateStr).getTime();
          const now = Date.now();
          const diffMs = now - alertTime;

          if (dateFilter === '24h') {
            matchesDate = diffMs <= 24 * 60 * 60 * 1000;
          } else if (dateFilter === '7d') {
            matchesDate = diffMs <= 7 * 24 * 60 * 60 * 1000;
          } else if (dateFilter === '30d') {
            matchesDate = diffMs <= 30 * 24 * 60 * 60 * 1000;
          }
        }
      }

      // 2. Filtro por Estado (Confirmado, En investigación, Resuelto, Todos)
      let matchesStatus = true;
      if (statusFilter !== 'todos') {
        const st = (alerta.estado || 'pendiente').toLowerCase();
        if (statusFilter === 'confirmado') {
          matchesStatus = (st === 'confirmado' || st === 'confirmada');
        } else if (statusFilter === 'en_investigacion') {
          matchesStatus = (st === 'en investigación' || st === 'en investigacion' || st === 'pendiente' || st === 'en_investigacion');
        } else if (statusFilter === 'resuelto') {
          matchesStatus = (st === 'resuelto' || st === 'encontrado');
        }
      }

      return matchesDate && matchesStatus;
    });
  }, [alerts, dateFilter, statusFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const formatCoordinates = (lat, lng) => {
    if (lat === undefined || lng === undefined || lat === null || lng === null) return 'N/A';
    const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
    const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
    return `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`;
  };

  const renderStatusBadge = (estadoStr) => {
    const st = (estadoStr || '').toLowerCase();
    if (st === 'confirmado' || st === 'confirmada') {
      return (
        <span 
          className="status-badge" 
          style={{ 
            position: 'static', 
            background: 'rgba(16, 185, 129, 0.2)', 
            border: '1px solid rgba(16, 185, 129, 0.4)', 
            color: '#10b981',
            display: 'inline-block'
          }}
        >
          Confirmado
        </span>
      );
    }
    if (st === 'en investigación' || st === 'en investigacion' || st === 'en_investigacion' || st === 'pendiente') {
      return (
        <span 
          className="status-badge" 
          style={{ 
            position: 'static', 
            background: 'rgba(245, 158, 11, 0.2)', 
            border: '1px solid rgba(245, 158, 11, 0.4)', 
            color: '#f59e0b',
            display: 'inline-block'
          }}
        >
          En investigación
        </span>
      );
    }
    if (st === 'resuelto' || st === 'encontrado') {
      return (
        <span 
          className="status-badge" 
          style={{ 
            position: 'static', 
            background: 'rgba(14, 165, 233, 0.2)', 
            border: '1px solid rgba(14, 165, 233, 0.4)', 
            color: '#0ea5e9',
            display: 'inline-block'
          }}
        >
          Resuelto
        </span>
      );
    }
    return (
      <span 
        className="status-badge" 
        style={{ 
          position: 'static', 
          background: 'rgba(255, 255, 255, 0.1)', 
          border: '1px solid rgba(255, 255, 255, 0.2)', 
          color: 'var(--text-secondary)',
          display: 'inline-block'
        }}
      >
        {estadoStr || 'Activa'}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Encabezado */}
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>Panel de Autoridades</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Supervisión georreferenciada y listado en tiempo real de alertas activas
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="btn btn-secondary" 
          disabled={loading}
        >
          🔄 Actualizar Datos
        </button>
      </div>

      {error && <div className="auth-error text-center mb-4">{error}</div>}

      {/* Tarjetas de Estadísticas en la parte superior con íconos */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '1.25rem', 
          marginBottom: '2rem' 
        }}
      >
        {/* Card 1: Total Alertas Activas */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div 
            style={{ 
              width: '54px', 
              height: '54px', 
              borderRadius: '14px', 
              background: 'rgba(244, 63, 94, 0.15)', 
              border: '1px solid rgba(244, 63, 94, 0.3)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.75rem',
              boxShadow: '0 0 15px rgba(244, 63, 94, 0.2)'
            }}
          >
            🚨
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              Alertas Activas
            </span>
            <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: '0.1rem 0 0 0', fontWeight: '800' }}>
              {stats.activeAlerts}
            </h2>
          </div>
        </div>

        {/* Card 2: Total Casos en Curso */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div 
            style={{ 
              width: '54px', 
              height: '54px', 
              borderRadius: '14px', 
              background: 'rgba(14, 165, 233, 0.15)', 
              border: '1px solid rgba(14, 165, 233, 0.3)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.75rem',
              boxShadow: '0 0 15px rgba(14, 165, 233, 0.2)'
            }}
          >
            🔍
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              Casos en Curso
            </span>
            <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: '0.1rem 0 0 0', fontWeight: '800' }}>
              {stats.casesInProgress}
            </h2>
          </div>
        </div>

        {/* Card 3: Total Casos Resueltos */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div 
            style={{ 
              width: '54px', 
              height: '54px', 
              borderRadius: '14px', 
              background: 'rgba(16, 185, 129, 0.15)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.75rem',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
            }}
          >
            ✅
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              Casos Resueltos
            </span>
            <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', margin: '0.1rem 0 0 0', fontWeight: '800' }}>
              {stats.casesResolved}
            </h2>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div 
        className="filters-bar glass-panel" 
        style={{ 
          padding: '1.25rem 1.5rem', 
          marginBottom: '2rem', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '1.25rem', 
          alignItems: 'flex-end',
          justifyContent: 'space-between' 
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', flex: '1' }}>
          {/* Filtro por Fecha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1', minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📅 Filtrar por Fecha
            </label>
            <select
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="todas">Todas las fechas</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Última semana</option>
              <option value="30d">Último mes</option>
            </select>
          </div>

          {/* Filtro por Estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1', minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🏷️ Filtrar por Estado
            </label>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="todos">Todos los estados</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_investigacion">En investigación</option>
              <option value="resuelto">Resuelto</option>
            </select>
          </div>
        </div>

        {/* Botón Limpiar Filtros */}
        {(dateFilter !== 'todas' || statusFilter !== 'todos') && (
          <button
            className="btn btn-secondary"
            onClick={() => { setDateFilter('todas'); setStatusFilter('todos'); }}
            style={{ fontSize: '0.85rem', padding: '0.75rem 1rem' }}
          >
            🧹 Limpiar filtros
          </button>
        )}
      </div>

      {/* Componente Mapa de Alertas (recibe las alertas filtradas) */}
      <MapaAlertas alerts={filteredAlerts} />

      {/* Tabla con las alertas filtradas */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            Listado de Alertas ({filteredAlerts.length} de {alerts.length})
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Endpoint: GET /api/alertas/activas
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cargando alertas y estadísticas...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '3rem 2rem', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡️</div>
            <h3>No se encontraron alertas para los filtros seleccionados</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Intente cambiando el rango de fechas o el filtro de estado.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="moderator-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre de la persona desaparecida</th>
                  <th>Estado</th>
                  <th>Fecha de detección</th>
                  <th>Ubicación (lat, lng)</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alerta) => (
                  <tr key={alerta.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      #{alerta.id}
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {alerta.nombre_desaparecido}
                    </td>
                    <td>
                      {renderStatusBadge(alerta.estado)}
                    </td>
                    <td>
                      {formatDate(alerta.fecha_deteccion || alerta.created_at)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      📍 {formatCoordinates(alerta.ubicacion_lat, alerta.ubicacion_lng)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorityPanel;
