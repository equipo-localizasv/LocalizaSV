import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../App';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [nombre, setNombre] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setPreview(user.selfie_url ? `http://localhost:3001${user.selfie_url}` : null);
    }
  }, [user]);

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

      setMessage(response.data.message);
      setUser(response.data.usuario);
      
      // Update local storage user data if needed or just rely on context
      // Depending on app logic, user context is enough
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

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>Mi Perfil</h2>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input 
              type="text" 
              id="nombre"
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required
              className="profile-input"
            />
          </div>

          <div className="form-group file-group">
            <label htmlFor="selfie">Foto de Perfil</label>
            {preview && (
              <div className="image-preview">
                <img src={preview} alt="Profile Preview" />
              </div>
            )}
            <input 
              type="file" 
              id="selfie"
              accept="image/*"
              onChange={handleFileChange} 
              className="profile-file-input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
