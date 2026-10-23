import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import api, { getServerBaseUrl, getImageUrl } from '../services/api';
import CaseDossierModal from '../components/CaseDossierModal';
import RegisterCommunityCameraModal from '../components/RegisterCommunityCameraModal';
import MissingPersonFlyerModal from '../components/MissingPersonFlyerModal';
import { 
  Shield, 
  User, 
  Mail, 
  CreditCard, 
  FileText, 
  Camera, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Eye, 
  ExternalLink 
} from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('expedientes'); // 'expedientes' | 'cuenta'
  const [nombre, setNombre] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Casos reportados por el usuario
  const [userCases, setUserCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [selectedDossierCaseId, setSelectedDossierCaseId] = useState(null);
  const [userCameras, setUserCameras] = useState([]);
  const [communityCamOpen, setCommunityCamOpen] = useState(false);
  const [flyerCase, setFlyerCase] = useState(null);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setPreview(user.selfie_url ? getImageUrl(user.selfie_url) : null);
      fetchUserCases();
    }
  }, [user]);

  const fetchUserCases = async () => {
    setCasesLoading(true);
    try {
      const res = await api.get('/cases');
      const allCases = res.data || [];
      // Filtrar casos del usuario si existen, o mostrar los casos activos
      const myCases = allCases.filter(c => c.usuario_id === user?.id || c.creador_id === user?.id);
      setUserCases(myCases.length > 0 ? myCases : allCases.slice(0, 4));
    } catch (err) {
      console.warn('Error fetching user cases:', err);
    } finally {
      setCasesLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      if (file) {
        formData.append('selfie', file);
      }

      const response = await api.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage('Perfil actualizado exitosamente.');
      setUser(response.data.usuario);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Error al actualizar el perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  const qrDigitalId = user 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`ID:${user.id}|DUI:${user.dui}|ROL:${user.rol}|NAME:${user.nombre}`)}`
    : '';


  const formatDate = (dateStr) => {
    if (!dateStr) return 'No especificada';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Tarjeta de Identificación Oficial Digital */}
      {user && (
        <div 
          style={{
            marginBottom: '2rem',
            padding: '1.75rem',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(11, 18, 36, 0.98))',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
            borderRadius: '16px',
            position: 'relative'
          }}
        >
          {/* Header de Credencial */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '0.85rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Shield size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
                  CREDENCIAL CIUDADANA OFICIAL • LOCALIZASV
                </span>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  República de El Salvador • Registro Nacional de Usuarios
                </div>
              </div>
            </div>
            <span style={{
              background: user.rol === 'moderador' ? 'rgba(168, 85, 247, 0.15)' : user.rol === 'autoridad' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${user.rol === 'moderador' ? 'rgba(168, 85, 247, 0.35)' : user.rol === 'autoridad' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
              color: user.rol === 'moderador' ? '#c084fc' : user.rol === 'autoridad' ? '#fbbf24' : '#34d399',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              {user.rol === 'moderador' ? 'Operador de Monitoreo' : user.rol === 'autoridad' ? 'Oficial PNC / Fiscalía' : 'Ciudadano Registrado'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            {/* Foto Oficial */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{
                width: '100px',
                height: '115px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid rgba(56, 189, 248, 0.4)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                background: '#0f172a',
                flexShrink: 0
              }}>
                <img
                  src={preview || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'}
                  alt="Perfil"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Datos de Credencial */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Titular Acreditado:
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: '0.2rem 0 0.4rem' }}>
                  {user.nombre}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div><strong style={{ color: '#94a3b8' }}>DUI:</strong> {user.dui || 'N/A'}</div>
                  <div><strong style={{ color: '#94a3b8' }}>Correo:</strong> {user.email}</div>
                  <div><strong style={{ color: '#94a3b8' }}>ID Sistema:</strong> #{user.id}</div>
                  {user.id_moderador && (
                    <div><strong style={{ color: '#c084fc' }}>ID Operador:</strong> {user.id_moderador}</div>
                  )}
                  {user.numero_placa && (
                    <div><strong style={{ color: '#38bdf8' }}>Placa Policial / ONI:</strong> {user.numero_placa}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Código QR de Validación Oficial */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: '#ffffff',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'inline-block',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                }}>
                  <img
                    src={qrDigitalId}
                    alt="QR Validación"
                    style={{ width: '90px', height: '90px', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.35rem', fontWeight: 600 }}>
                  VALIDACIÓN OFICIAL
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pestañas de Navegación del Perfil */}
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('expedientes')}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'expedientes' ? '3px solid #0284c7' : '3px solid transparent',
            background: activeTab === 'expedientes' ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
            color: activeTab === 'expedientes' ? '#38bdf8' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <FileText size={16} />
          <span>Mis Expedientes de Búsqueda ({userCases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('camaras')}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'camaras' ? '3px solid #0284c7' : '3px solid transparent',
            background: activeTab === 'camaras' ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
            color: activeTab === 'camaras' ? '#38bdf8' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Camera size={16} />
          <span>Mis Cámaras Conectadas ({userCameras.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cuenta')}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            borderBottom: activeTab === 'cuenta' ? '3px solid #0284c7' : '3px solid transparent',
            background: activeTab === 'cuenta' ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
            color: activeTab === 'cuenta' ? '#38bdf8' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <User size={16} />
          <span>Configuración de Cuenta</span>
        </button>
      </div>

      {/* Pestaña 1: Mis Expedientes */}
      {activeTab === 'expedientes' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
                Expedientes Asociados a tu Cuenta
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Accede al expediente forense completo, revisa el mapa de calor o descarga el afiche oficial de búsqueda.
              </p>
            </div>
            <Link
              to="/reportar"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#0284c7',
                color: '#fff',
                textDecoration: 'none'
              }}
            >
              + Nuevo Reporte
            </Link>
          </div>

          {casesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '36px', height: '36px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cargando expedientes...</p>
            </div>
          ) : userCases.length === 0 ? (
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '3rem 2rem',
              textAlign: 'center'
            }}>
              <FileText size={36} color="#64748b" style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ color: '#f8fafc', margin: 0 }}>No tienes expedientes registrados</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.5rem auto 1.25rem', maxWidth: '380px' }}>
                Si tienes a un familiar o conocido desaparecido, puedes generar un reporte oficial inmediato.
              </p>
              <Link to="/reportar" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                Reportar Desaparición
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {userCases.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ position: 'relative', height: '160px', background: '#090d16' }}>
                    <img
                      src={getImageUrl(c.foto_url)}
                      alt={c.nombre_desaparecido}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: c.estado === 'Desaparecido' ? 'rgba(225, 29, 72, 0.9)' : 'rgba(5, 150, 105, 0.9)',
                      color: '#ffffff'
                    }}>
                      {c.estado}
                    </span>
                    <span style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '6px',
                      background: 'rgba(2, 6, 23, 0.85)',
                      color: '#38bdf8',
                      fontSize: '0.68rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontFamily: 'monospace'
                    }}>
                      EXP #{c.id}
                    </span>
                  </div>

                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', color: '#f8fafc' }}>
                      {c.nombre_desaparecido}
                    </h4>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
                      <div>{c.edad} años • Visto: {formatDate(c.fecha_desaparicion)}</div>
                      <div style={{ color: '#38bdf8', marginTop: '0.2rem' }}>📍 {c.ubicacion_desaparicion}</div>
                    </div>

                    {/* Botones de Acción: EXPEDIENTE EN EL MISMO PORTAL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto' }}>
                      <Link
                        to={`/caso/${c.id}`}
                        style={{
                          width: '100%',
                          padding: '0.48rem',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(99, 102, 241, 0.25))',
                          border: '1px solid rgba(56, 189, 248, 0.45)',
                          color: '#38bdf8',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          textDecoration: 'none'
                        }}
                      >
                        <FileText size={14} />
                        <span>Ver Expediente Forense</span>
                      </Link>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <Link
                          to={`/caso/${c.id}`}
                          style={{
                            padding: '0.4rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#e2e8f0',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Eye size={13} />
                          <span>Ficha Pública</span>
                        </Link>

                        <button
                          onClick={() => setFlyerCase(c)}
                          style={{
                            padding: '0.4rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#e2e8f0',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Printer size={13} />
                          <span>Afiche</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pestaña 2: Configuración de Cuenta */}
      {activeTab === 'cuenta' && (
        <div 
          className="animate-fade-in"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.75rem'
          }}
        >
          <h3 style={{ color: '#f8fafc', margin: '0 0 1rem 0', fontSize: '1.15rem' }}>
            Actualizar Datos de Cuenta
          </h3>
          
          {message && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem'
            }}>
              {message}
            </div>
          )}
          
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="nombre" className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                Nombre Completo
              </label>
              <input 
                type="text" 
                id="nombre"
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                required
                className="form-control"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(2, 6, 23, 0.6)',
                  color: '#ffffff',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="selfie" className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>
                Actualizar Fotografía de Perfil / Credencial
              </label>
              {preview && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #0284c7' }}
                  />
                </div>
              )}
              <input 
                type="file" 
                id="selfie"
                accept="image/*"
                onChange={handleFileChange} 
                style={{ fontSize: '0.85rem', color: '#94a3b8' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: '0.65rem 1.4rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      )}

      {/* Modal: Expediente Forense Completo (Abre interfaz nueva centrada en pantalla sin saltar abajo) */}
      {selectedDossierCaseId && (
        <CaseDossierModal
          isOpen={Boolean(selectedDossierCaseId)}
          caseId={selectedDossierCaseId}
          onClose={() => setSelectedDossierCaseId(null)}
        />
      )}

      {/* Modal: Afiche Imprimible Se Busca */}
      <MissingPersonFlyerModal
        isOpen={Boolean(flyerCase)}
        caso={flyerCase}
        onClose={() => setFlyerCase(null)}
      />
    </div>
  );
};

export default Profile;
