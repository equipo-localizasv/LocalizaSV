import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CreateCase = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    nombre_desaparecido: '',
    edad: '',
    genero: 'Masculino',
    fecha_desaparicion: '',
    ubicacion_desaparicion: '',
    descripcion: '',
    telefono_contacto: ''
  });

  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setError('');

    if (name === 'telefono_contacto') {
      let clean = value.replace(/\D/g, '').slice(0, 8);
      if (clean.length > 4) {
        clean = clean.slice(0, 4) + '-' + clean.slice(4);
      }
      setForm({ ...form, [name]: clean });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('El archivo debe ser una imagen.');
        return;
      }
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploaderClick = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const {
      nombre_desaparecido,
      edad,
      genero,
      fecha_desaparicion,
      ubicacion_desaparicion,
      descripcion,
      telefono_contacto
    } = form;

    if (
      !nombre_desaparecido ||
      !edad ||
      !genero ||
      !fecha_desaparicion ||
      !ubicacion_desaparicion ||
      !descripcion ||
      !telefono_contacto ||
      !foto
    ) {
      setError('Por favor, complete todos los campos y suba una foto.');
      return;
    }

    const PHONE_REGEX = /^[2678]\d{3}-?\d{4}$/;
    if (!PHONE_REGEX.test(telefono_contacto)) {
      setError('El teléfono de contacto debe ser un número salvadoreño válido de 8 dígitos.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nombre_desaparecido', nombre_desaparecido);
      formData.append('edad', edad);
      formData.append('genero', genero);
      formData.append('fecha_desaparicion', fecha_desaparicion);
      formData.append('ubicacion_desaparicion', ubicacion_desaparicion);
      formData.append('descripcion', descripcion);
      formData.append('telefono_contacto', telefono_contacto);
      formData.append('foto', foto);

      await api.post('/cases', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reportar el caso. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper glass-panel animate-fade-in" style={{ maxWidth: '650px', margin: '1.5rem auto' }}>
      <div className="auth-header">
        <h2>Reportar Persona Desaparecida</h2>
        <p>Proporcione la mayor cantidad de información y detalles para ayudar a su localización</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <label className="form-label text-center">Fotografía Reciente</label>
          <div className="image-uploader-container w-100" onClick={handleUploaderClick} style={{ minHeight: '200px' }}>
            {fotoPreview ? (
              <img src={fotoPreview} alt="Preview" className="uploader-preview square" />
            ) : (
              <>
                <div className="uploader-icon">🖼️</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Haz clic para subir una foto de la persona desaparecida
                </p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="nombre_desaparecido">Nombre Completo de la Persona Desaparecida</label>
          <input
            id="nombre_desaparecido"
            name="nombre_desaparecido"
            type="text"
            className="form-control"
            placeholder="Ej. María Elena López"
            value={form.nombre_desaparecido}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>

        <div className="meta-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="edad">Edad Aprox.</label>
            <input
              id="edad"
              name="edad"
              type="number"
              min="0"
              max="120"
              className="form-control"
              placeholder="Ej. 24"
              value={form.edad}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="genero">Género</label>
            <select
              id="genero"
              name="genero"
              className="form-control"
              value={form.genero}
              onChange={handleInputChange}
              disabled={loading}
            >
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="meta-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="fecha_desaparicion">Fecha de Desaparición</label>
            <input
              id="fecha_desaparicion"
              name="fecha_desaparicion"
              type="date"
              className="form-control"
              value={form.fecha_desaparicion}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="telefono_contacto">Teléfono de Contacto Rápido</label>
            <input
              id="telefono_contacto"
              name="telefono_contacto"
              type="text"
              className="form-control"
              placeholder="7000-0000"
              value={form.telefono_contacto}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ubicacion_desaparicion">Último lugar donde fue visto(a)</label>
          <input
            id="ubicacion_desaparicion"
            name="ubicacion_desaparicion"
            type="text"
            className="form-control"
            placeholder="Ej. Cerca de Metrocentro San Salvador, San Salvador"
            value={form.ubicacion_desaparicion}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="descripcion">Descripción física y señas particulares</label>
          <textarea
            id="descripcion"
            name="descripcion"
            className="form-control"
            placeholder="Describa la ropa que vestía, estatura, color de cabello, tatuajes o marcas distintivas..."
            value={form.descripcion}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button type="button" onClick={() => navigate('/')} className="btn btn-secondary w-50" disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary w-50" disabled={loading}>
            {loading ? 'Guardando reporte...' : 'Publicar Reporte'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCase;
