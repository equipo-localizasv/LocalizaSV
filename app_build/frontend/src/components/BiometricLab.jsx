import React, { useState, useRef } from 'react';
import api from '../services/api';

const BiometricLab = ({ cases = [], alerts = [] }) => {
  const [activeTool, setActiveTool] = useState('1to1'); // '1to1' | '1toN' | 'diagnostico'

  // ========== ESTADOS PARA COTEJO 1:1 ==========
  const [photo1, setPhoto1] = useState(null);
  const [photo1Preview, setPhoto1Preview] = useState('');
  const [photo2, setPhoto2] = useState(null);
  const [photo2Preview, setPhoto2Preview] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [comparing1to1, setComparing1to1] = useState(false);
  const [compareError, setCompareError] = useState('');

  const input1Ref = useRef(null);
  const input2Ref = useRef(null);

  // ========== ESTADOS PARA BÚSQUEDA 1:N ==========
  const [searchPhoto, setSearchPhoto] = useState(null);
  const [searchPhotoPreview, setSearchPhotoPreview] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching1toN, setSearching1toN] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchInputRef = useRef(null);

  // ========== ESTADOS PARA DIAGNÓSTICO ==========
  const [diagPhoto, setDiagPhoto] = useState(null);
  const [diagPhotoPreview, setDiagPhotoPreview] = useState('');
  const [diagResult, setDiagResult] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagError, setDiagError] = useState('');
  const diagInputRef = useRef(null);

  // Handlers para 1:1
  const handleSelectCaseForPhoto1 = (e) => {
    const casoId = parseInt(e.target.value);
    if (!casoId) return;
    const c = cases.find((item) => item.id === casoId);
    if (c && c.foto_url) {
      setPhoto1({ isExistingUrl: true, url: c.foto_url });
      setPhoto1Preview(c.foto_url.startsWith('http') ? c.foto_url : `http://localhost:3001${c.foto_url}`);
    }
  };

  const handleSelectAlertForPhoto2 = (e) => {
    const alertId = parseInt(e.target.value);
    if (!alertId) return;
    const a = alerts.find((item) => item.id === alertId);
    if (a && a.foto_evidencia_url) {
      setPhoto2({ isExistingUrl: true, url: a.foto_evidencia_url });
      setPhoto2Preview(a.foto_evidencia_url.startsWith('http') ? a.foto_evidencia_url : `http://localhost:3001${a.foto_evidencia_url}`);
    }
  };

  const handleFileChange1 = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto1(file);
      setPhoto1Preview(URL.createObjectURL(file));
      setCompareResult(null);
    }
  };

  const handleFileChange2 = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto2(file);
      setPhoto2Preview(URL.createObjectURL(file));
      setCompareResult(null);
    }
  };

  const run1to1Compare = async () => {
    if (!photo1Preview || !photo2Preview) {
      alert('Por favor seleccione o suba ambas imágenes para realizar el cotejo.');
      return;
    }

    setComparing1to1(true);
    setCompareError('');
    setCompareResult(null);

    try {
      let url1 = photo1?.url || null;
      let url2 = photo2?.url || null;

      // Si alguna es archivo subido, primero subimos / escaneamos
      if (photo1 instanceof File) {
        const fData1 = new FormData();
        fData1.append('foto', photo1);
        const res1 = await api.post('/biometria/scan', fData1, { headers: { 'Content-Type': 'multipart/form-data' } });
        url1 = res1.data.image_url;
      }

      if (photo2 instanceof File) {
        const fData2 = new FormData();
        fData2.append('foto', photo2);
        const res2 = await api.post('/biometria/scan', fData2, { headers: { 'Content-Type': 'multipart/form-data' } });
        url2 = res2.data.image_url;
      }

      const res = await api.post('/biometria/compare', {
        foto1_url: url1,
        foto2_url: url2
      });

      setCompareResult(res.data);
    } catch (err) {
      console.error('Error al cotejar:', err);
      setCompareError('Ocurrió un error procesando el cotejo biométrico.');
    } finally {
      setComparing1to1(false);
    }
  };

  // Handlers para 1:N
  const handleSearchFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSearchPhoto(file);
      setSearchPhotoPreview(URL.createObjectURL(file));
      setSearchResult(null);
    }
  };

  const run1toNSearch = async () => {
    if (!searchPhoto) {
      alert('Suba una imagen de rostro para buscar en la base de datos.');
      return;
    }

    setSearching1toN(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const formData = new FormData();
      formData.append('foto', searchPhoto);

      const res = await api.post('/biometria/search', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSearchResult(res.data);
    } catch (err) {
      console.error('Error en búsqueda 1:N:', err);
      setSearchError(err.response?.data?.error || 'No se pudo completar la búsqueda biométrica.');
    } finally {
      setSearching1toN(false);
    }
  };

  // Handlers para Diagnóstico
  const handleDiagFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDiagPhoto(file);
      setDiagPhotoPreview(URL.createObjectURL(file));
      setDiagResult(null);
    }
  };

  const runDiagnosis = async () => {
    if (!diagPhoto) {
      alert('Suba una imagen para ejecutar el diagnóstico.');
      return;
    }

    setDiagnosing(true);
    setDiagError('');
    setDiagResult(null);

    try {
      const formData = new FormData();
      formData.append('foto', diagPhoto);

      const res = await api.post('/biometria/diagnostico', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setDiagResult(res.data.diagnostics);
    } catch (err) {
      console.error('Error en diagnóstico:', err);
      setDiagError('Error analizando la calidad de la imagen.');
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.75rem', borderRadius: '16px', border: '1px solid rgba(14, 165, 233, 0.25)', background: 'rgba(11, 15, 25, 0.95)' }}>
      {/* Header del Laboratorio */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🔬</span>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>
              Laboratorio Biométrico Forense InsightFace
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Herramientas avanzadas de cotejo facial 1:1, rastreo en base de datos 1:N y diagnóstico de calidad RetinaFace
          </p>
        </div>

        {/* Selector de Herramienta */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '0.3rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', gap: '0.3rem' }}>
          <button
            onClick={() => setActiveTool('1to1')}
            style={{
              background: activeTool === '1to1' ? '#0ea5e9' : 'transparent',
              color: activeTool === '1to1' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⚖️ Cotejo 1:1
          </button>
          <button
            onClick={() => setActiveTool('1toN')}
            style={{
              background: activeTool === '1toN' ? '#0ea5e9' : 'transparent',
              color: activeTool === '1toN' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🔍 Búsqueda 1:N
          </button>
          <button
            onClick={() => setActiveTool('diagnostico')}
            style={{
              background: activeTool === 'diagnostico' ? '#0ea5e9' : 'transparent',
              color: activeTool === 'diagnostico' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            📐 Diagnóstico Facial
          </button>
        </div>
      </div>

      {/* ================= HERRAMIENTA 1: COTEJO 1:1 ================= */}
      {activeTool === '1to1' && (
        <div className="animate-fade-in">
          <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#38bdf8' }}>
            ℹ️ <strong>Cotejo Facial 1:1:</strong> Compara dos fotografías cualesquiera o selecciona casos y evidencias existentes. InsightFace extraerá sus vectores ArcFace de 512 dimensiones y calculará la similitud de cosenos y distancia euclidiana.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Slot Imagen 1 */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>SUJETO A (Muestra Base)</strong>
                <select
                  onChange={handleSelectCaseForPhoto1}
                  defaultValue=""
                  style={{ background: '#090d16', color: '#cbd5e1', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                >
                  <option value="" disabled>Seleccionar de caso...</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>Caso #{c.id} - {c.nombre_desaparecido}</option>
                  ))}
                </select>
              </div>

              <div
                onClick={() => input1Ref.current?.click()}
                style={{
                  height: '210px',
                  borderRadius: '8px',
                  border: '2px dashed rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#020617',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {photo1Preview ? (
                  <img src={photo1Preview} alt="Sujeto A" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📷</div>
                    Clic para subir Foto 1
                  </div>
                )}
                <input ref={input1Ref} type="file" accept="image/*" onChange={handleFileChange1} style={{ display: 'none' }} />
              </div>
            </div>

            {/* Slot Imagen 2 */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ color: '#f59e0b', fontSize: '0.9rem' }}>SUJETO B (Muestra a Cotejar)</strong>
                <select
                  onChange={handleSelectAlertForPhoto2}
                  defaultValue=""
                  style={{ background: '#090d16', color: '#cbd5e1', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                >
                  <option value="" disabled>Seleccionar de alerta...</option>
                  {alerts.map((a) => (
                    <option key={a.id} value={a.id}>Alerta #{a.id} ({a.tipo_origen || 'Avistamiento'})</option>
                  ))}
                </select>
              </div>

              <div
                onClick={() => input2Ref.current?.click()}
                style={{
                  height: '210px',
                  borderRadius: '8px',
                  border: '2px dashed rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#020617',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {photo2Preview ? (
                  <img src={photo2Preview} alt="Sujeto B" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📷</div>
                    Clic para subir Foto 2
                  </div>
                )}
                <input ref={input2Ref} type="file" accept="image/*" onChange={handleFileChange2} style={{ display: 'none' }} />
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <button
              onClick={run1to1Compare}
              disabled={comparing1to1 || !photo1Preview || !photo2Preview}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)' }}
            >
              {comparing1to1 ? '⏳ Analizando con InsightFace...' : '⚡ Ejecutar Cotejo Facial ArcFace 512-D'}
            </button>
          </div>

          {compareError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
              ⚠️ {compareError}
            </div>
          )}

          {/* Resultado del Cotejo */}
          {compareResult?.comparison && (
            <div
              className="glass-panel animate-fade-in"
              style={{
                background: compareResult.comparison.match ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${compareResult.comparison.match ? '#10b981' : '#ef4444'}`,
                borderRadius: '12px',
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Dictamen Pericial Automatizado</div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: compareResult.comparison.match ? '#34d399' : '#f87171' }}>
                    {compareResult.comparison.verdict}
                  </h3>
                </div>
                <div style={{
                  background: compareResult.comparison.match ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: compareResult.comparison.match ? '#10b981' : '#ef4444',
                  border: `1px solid ${compareResult.comparison.match ? '#10b981' : '#ef4444'}`,
                  padding: '0.4rem 1rem',
                  borderRadius: '20px',
                  fontSize: '1.1rem',
                  fontWeight: 800
                }}>
                  {compareResult.comparison.percentage}% DE SIMILITUD
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Distancia Euclidiana</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                    {compareResult.comparison.euclidean_distance}
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Umbral de Decisión</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                    68.0% ArcFace
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Nivel de Confianza</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: compareResult.comparison.match ? '#10b981' : '#ef4444' }}>
                    {compareResult.comparison.confidence_label}
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Motor Utilizado</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#e2e8f0' }}>
                    InsightFace 512-D
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= HERRAMIENTA 2: BÚSQUEDA 1:N ================= */}
      {activeTool === '1toN' && (
        <div className="animate-fade-in">
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#34d399' }}>
            ℹ️ <strong>Rastreo Facial 1:N:</strong> Sube una captura de cámara CCTV, fotografía ciudadana o rostro no identificado. El sistema comparará su vector contra todos los casos de desaparecidos activos en El Salvador.
          </div>

          <div style={{ maxWidth: '450px', margin: '0 auto 1.5rem auto' }}>
            <div
              onClick={() => searchInputRef.current?.click()}
              style={{
                height: '240px',
                borderRadius: '12px',
                border: '2px dashed rgba(16, 185, 129, 0.4)',
                background: '#020617',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {searchPhotoPreview ? (
                <img src={searchPhotoPreview} alt="Consulta" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
                  <strong style={{ color: '#f8fafc', display: 'block' }}>Subir Fotograma o Rostro a Identificar</strong>
                  <span style={{ fontSize: '0.8rem' }}>Haz clic para seleccionar imagen</span>
                </div>
              )}
              <input ref={searchInputRef} type="file" accept="image/*" onChange={handleSearchFileChange} style={{ display: 'none' }} />
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                onClick={run1toNSearch}
                disabled={searching1toN || !searchPhotoPreview}
                className="btn btn-primary"
                style={{ padding: '0.75rem 2rem', fontWeight: 700, width: '100%' }}
              >
                {searching1toN ? '⏳ Buscando coincidencias en la base de datos...' : '🔍 Rastrear en Casos de Desaparecidos'}
              </button>
            </div>
          </div>

          {searchError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
              ⚠️ {searchError}
            </div>
          )}

          {/* Resultados de la búsqueda 1:N */}
          {searchResult && (
            <div className="animate-fade-in" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                  Candidatos Identificados ({searchResult.total_compared} casos cotejados)
                </h3>
              </div>

              {searchResult.all_results?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No se encontraron casos registrados para comparar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {searchResult.all_results.map((cand, idx) => {
                    const isCandidateMatch = cand.match;
                    return (
                      <div
                        key={cand.caso_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          borderRadius: '10px',
                          background: isCandidateMatch ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                          border: `1px solid ${isCandidateMatch ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: idx === 0 ? '#f59e0b' : '#64748b' }}>
                            #{idx + 1}
                          </span>
                          <img
                            src={cand.foto_url.startsWith('http') ? cand.foto_url : `http://localhost:3001${cand.foto_url}`}
                            alt={cand.nombre_desaparecido}
                            style={{ width: '55px', height: '55px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }}
                          />
                          <div>
                            <h4 style={{ margin: '0 0 0.2rem 0', color: '#fff', fontSize: '1rem' }}>
                              {cand.nombre_desaparecido}
                            </h4>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              Caso #{cand.caso_id} | Edad: {cand.edad} años | {cand.departamento}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: isCandidateMatch ? '#34d399' : cand.similarity_percentage >= 50 ? '#fbbf24' : '#94a3b8'
                            }}>
                              {cand.similarity_percentage}%
                            </div>
                            <div style={{ fontSize: '0.72rem', color: isCandidateMatch ? '#10b981' : '#64748b' }}>
                              {cand.verdict}
                            </div>
                          </div>
                          <a
                            href={`/caso/${cand.caso_id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                          >
                            Ver Caso
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= HERRAMIENTA 3: DIAGNÓSTICO RETINAFACE ================= */}
      {activeTool === 'diagnostico' && (
        <div className="animate-fade-in">
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#fbbf24' }}>
            ℹ️ <strong>Diagnóstico de Aptitud Facial:</strong> Verifica si una fotografía tiene la iluminación, resolución y orientación angular necesarias para permitir cotejos biométricos confiables en cámaras de seguridad.
          </div>

          <div style={{ maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            <div
              onClick={() => diagInputRef.current?.click()}
              style={{
                height: '230px',
                borderRadius: '12px',
                border: '2px dashed rgba(245, 158, 11, 0.4)',
                background: '#020617',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {diagPhotoPreview ? (
                <img src={diagPhotoPreview} alt="Diagnóstico" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📐</div>
                  <strong style={{ color: '#f8fafc', display: 'block' }}>Subir Fotografía para Evaluación</strong>
                  <span style={{ fontSize: '0.8rem' }}>Evaluar pose, ángulo y calidad</span>
                </div>
              )}
              <input ref={diagInputRef} type="file" accept="image/*" onChange={handleDiagFileChange} style={{ display: 'none' }} />
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                onClick={runDiagnosis}
                disabled={diagnosing || !diagPhotoPreview}
                className="btn btn-primary"
                style={{ padding: '0.75rem 2rem', fontWeight: 700, width: '100%' }}
              >
                {diagnosing ? '⏳ Evaluando geometría y calidad...' : '📐 Ejecutar Diagnóstico RetinaFace'}
              </button>
            </div>
          </div>

          {diagError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
              ⚠️ {diagError}
            </div>
          )}

          {diagResult && (
            <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#38bdf8' }}>
                Reporte Técnico de Aptitud Biométrica
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Detección de Rostro</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: diagResult.face_detected ? '#10b981' : '#ef4444' }}>
                    {diagResult.face_detected ? '✓ Identificado' : '✕ No detectado'}
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Score de Calidad</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>
                    {Math.round(diagResult.quality_score * 100)}%
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Giro Horizontal (Yaw)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b' }}>
                    {diagResult.pose?.yaw || 0}°
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Inclinación Vertical (Pitch)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b' }}>
                    {diagResult.pose?.pitch || 0}°
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#f8fafc' }}>
                  Recomendaciones Periciales:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {diagResult.recommendations?.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BiometricLab;
