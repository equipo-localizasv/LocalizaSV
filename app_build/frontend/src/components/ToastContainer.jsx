import React from 'react';
import { useNavigate } from 'react-router-dom';

const ToastContainer = ({ toasts = [], onDismiss }) => {
  const navigate = useNavigate();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const { id, alerta, created_at } = toast;
        const confidence = alerta?.porcentaje_confianza || 0;
        const confidenceColor = confidence > 80 ? '#10b981' : '#0ea5e9';

        return (
          <div key={id} className="toast-card glass-panel animate-toast-in">
            <div className="toast-header">
              <div className="toast-title-wrapper">
                <span className="toast-icon">🚨</span>
                <strong className="toast-title">¡Nueva Alerta Detectada!</strong>
              </div>
              <button 
                onClick={() => onDismiss(id)} 
                className="toast-close-btn"
                title="Cerrar notificación"
              >
                ✕
              </button>
            </div>

            <div className="toast-body">
              <div className="toast-case-name">
                {alerta?.nombre_desaparecido || `Caso #${alerta?.caso_id || 'N/A'}`}
              </div>
              <div className="toast-meta">
                <span>📍 Lat: {alerta?.ubicacion_lat ? Number(alerta.ubicacion_lat).toFixed(4) : 'N/A'}, Lng: {alerta?.ubicacion_lng ? Number(alerta.ubicacion_lng).toFixed(4) : 'N/A'}</span>
              </div>
              <div className="toast-footer">
                <span 
                  className="toast-confidence-badge"
                  style={{ backgroundColor: `${confidenceColor}22`, color: confidenceColor, borderColor: `${confidenceColor}55` }}
                >
                  Confianza: {confidence}%
                </span>
                <button 
                  onClick={() => {
                    if (onDismiss) onDismiss(id);
                    navigate('/moderacion');
                  }}
                  className="btn btn-primary toast-action-btn"
                >
                  Ver en Moderación →
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
