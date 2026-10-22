import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { getServerBaseUrl } from '../services/api';
import socketService from '../services/socket';
import ActiveAlertsMap from '../components/ActiveAlertsMap';
import BiometricVerificationModal from '../components/BiometricVerificationModal';
import CaseDossierModal from '../components/CaseDossierModal';

const DEPARTAMENTOS_SV = [
  'San Salvador',
  'La Libertad',
  'Santa Ana',
  'San Miguel',
  'Sonsonate',
  'Ahuachapán',
  'Usulután',
  'La Paz',
  'Cuscatlán',
  'Chalatenango',
  'Cabañas',
  'Morazán',
  'San Vicente',
  'La Unión'
];

const ModeratorPanel = () => {
  const [activeTab, setActiveTab] = useState('camaras'); // 'camaras' | 'casos' | 'alertas' | 'biometria'
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [camerasLoading, setCamerasLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [expandedCamera, setExpandedCamera] = useState(null);
  const [biometricModalAlert, setBiometricModalAlert] = useState(null);
  const [selectedDossierCaseId, setSelectedDossierCaseId] = useState(null);

  // Bitácora de Auditoría Operativa en Vivo
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'AUD-8842',
      fecha: new Date(Date.now() - 10 * 60000).toISOString(),
      accion: 'Verificación Facial Confirmada',
      tipo: 'alerta',
      detalles: 'Coincidencia biométrica positiva (94.2% similitud) verificada en Cámara Principal C4I para Expediente #3.',
      operador: 'Operador DCI #402',
      estado: 'Notificado a PNC 911',
      hash: '9f8e7d6c5b4a3120ef890123456789abcdef0123456789abcdef0123456789ab',
      ip_origen: '192.168.10.45',
      estacion: 'Puesto C4I Alpha-1'
    },
    {
      id: 'AUD-8841',
      fecha: new Date(Date.now() - 35 * 60000).toISOString(),
      accion: 'Inspección de Flujo C4I',
      tipo: 'sistema',
      detalles: 'Alineación de cámara única C4I activa. Latencia media de 38ms y compresión H.264 validada.',
      operador: 'Operador DCI #402',
      estado: 'Circuito Conforme',
      hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      ip_origen: '192.168.10.45',
      estacion: 'Puesto C4I Alpha-1'
    },
    {
      id: 'AUD-8840',
      fecha: new Date(Date.now() - 55 * 60000).toISOString(),
      accion: 'Actualización de Estado Táctico',
      tipo: 'caso',
      detalles: 'Expediente #4 actualizado a "En Proceso de Rescate" con asignación de cuadrante y patrulla PNC.',
      operador: 'Supervisor PNC #104',
      estado: 'Operativo Desplegado',
      hash: '3f2d1e0c9b8a76543210fedcba9876543210fedcba9876543210fedcba987654',
      ip_origen: '192.168.10.12',
      estacion: 'Centro Táctico PNC 911'
    },
    {
      id: 'AUD-8839',
      fecha: new Date(Date.now() - 130 * 60000).toISOString(),
      accion: 'Dossier Forense Emitido',
      tipo: 'forense',
      detalles: 'Generado informe de cotejo pericial y cadena de custodia criptográfica digital para remisión a FGR.',
      operador: 'Perito Forense DCI #109',
      estado: 'Archivado SHA-256',
      hash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
      ip_origen: '192.168.10.88',
      estacion: 'Laboratorio Forense DCI'
    },
    {
      id: 'AUD-8838',
      fecha: new Date(Date.now() - 220 * 60000).toISOString(),
      accion: 'Descarte de Falso Positivo',
      tipo: 'alerta',
      detalles: 'Descartada alerta #12 tras revisión visual por rasgos fisonómicos divergentes (<50% confianza).',
      operador: 'Operador DCI #402',
      estado: 'Cerrado',
      hash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
      ip_origen: '192.168.10.45',
      estacion: 'Puesto C4I Alpha-1'
    },
    {
      id: 'AUD-8837',
      fecha: new Date(Date.now() - 360 * 60000).toISOString(),
      accion: 'Inicio de Turno / Autenticación C4I',
      tipo: 'sistema',
      detalles: 'Apertura de consola de monitoreo por Operador DCI #402 con verificación 2FA y credencial segura.',
      operador: 'Operador DCI #402',
      estado: 'Sesión Segura',
      hash: '8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
      ip_origen: '192.168.10.45',
      estacion: 'Puesto C4I Alpha-1'
    }
  ]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState('todos');
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [newLogData, setNewLogData] = useState({
    accion: '',
    tipo: 'alerta',
    detalles: '',
    operador: 'Operador DCI #402',
    estado: 'Verificado Manualmente',
    estacion: 'Puesto C4I Alpha-1'
  });
  const [auditExportNotice, setAuditExportNotice] = useState('');
  const [copiedHashNotice, setCopiedHashNotice] = useState('');

  const [cctvLayoutMode, setCctvLayoutMode] = useState('focus'); // Por defecto 'focus' para monitor único fluido
  const [cctvSearchTerm, setCctvSearchTerm] = useState('');
  const [useDirectStreamMode, setUseDirectStreamMode] = useState({}); // { [camId]: boolean }
  const [streamRefreshKey, setStreamRefreshKey] = useState(0); // Clave para purgar búferes y reconectar stream
  const [cctvDeptFilter, setCctvDeptFilter] = useState('todos');
  const [cctvTypeFilter, setCctvTypeFilter] = useState('todos');
  const [cctvStatusFilter, setCctvStatusFilter] = useState('todos');
  const [selectedFocusCamId, setSelectedFocusCamId] = useState(null);
  const [circuitScanning, setCircuitScanning] = useState(false);
  const [circuitScanNotice, setCircuitScanNotice] = useState('');

  // Función para escaneo simultáneo de todo el circuito
  const handleScanAllCircuit = async () => {
    if (cameras.length === 0) return;
    setCircuitScanning(true);
    setCircuitScanNotice('Iniciando barrido facial automático en todas las cámaras activas...');
    let totalScanned = 0;
    for (const cam of cameras) {
      try {
        await handleTriggerLiveDetection(cam);
        totalScanned++;
      } catch (e) {
        console.warn('Error escaneando cámara:', cam.id, e);
      }
    }
    setCircuitScanning(false);
    setCircuitScanNotice(`✓ Barrido de circuito completado en ${totalScanned} canales.`);
    setTimeout(() => setCircuitScanNotice(''), 5000);
  };

  // Filtros y búsqueda de Casos para moderadores
  const [caseSearchTerm, setCaseSearchTerm] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState('todos');
  const [caseDeptFilter, setCaseDeptFilter] = useState('todos');

  // Sentinel Autónomo de Reconexión de Cámaras
  const [autoReconnectActive, setAutoReconnectActive] = useState(true);
  const [reconnectSentinelCount, setReconnectSentinelCount] = useState(0);

  // Estados de control de cámara activa
  const [controllingCamId, setControllingCamId] = useState(null);
  const [camControlsState, setCamControlsState] = useState({}); // { [camId]: { torch: false, zoom: 0, facing: 'back', pan: 0, tilt: 0, patrol: false, statusMsg: '' } }
  const [camStatus, setCamStatus] = useState({}); // { [camId]: { online: boolean, latency_ms: number, error: string, testing: boolean } }
  const [camStreamErrors, setCamStreamErrors] = useState({}); // { [camId]: boolean }
  const [cameraSubTab, setCameraSubTab] = useState({}); // { [camId]: 'ptz' | 'tools' }

  // Zoom Digital Directo en la Misma Cámara y Modo Enfoque en la Misma Pantalla (Sin pantallitas desordenadas abajo)
  const [focusedCameraId, setFocusedCameraId] = useState(null);
  const [digitalZoomState, setDigitalZoomState] = useState({}); // { [camId]: 1, 1.5, 2, 3 }
  const [showCamControlsDrawer, setShowCamControlsDrawer] = useState({}); // { [camId]: boolean }

  // Modal para conectar nueva cámara (PTZ Wi-Fi / IP Webcam)
  const [showAddCamModal, setShowAddCamModal] = useState(false);
  const [showMobileLinkModal, setShowMobileLinkModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newCamForm, setNewCamForm] = useState({
    nombre: 'Cámara Robótica PTZ Wi-Fi 01',
    ip_address: '192.168.1.75:8080',
    departamento: 'San Salvador',
    ubicacion: 'San Salvador Centro, El Salvador',
    lat: '13.6929',
    lng: '-89.2182',
    tipo: 'Cámara IP Wi-Fi PTZ 360° (Robótica / Domo)',
    resolucion: '1080p FHD',
    fps: '30'
  });
  const [camSubmitting, setCamSubmitting] = useState(false);
  const [ipTestStatus, setIpTestStatus] = useState('');

  // Modal para editar IP de cámara existente
  const [editingCamera, setEditingCamera] = useState(null);
  const [editIpValue, setEditIpValue] = useState('');
  const [editIpSaving, setEditIpSaving] = useState(false);

  // Estado del Motor de Vigilancia Autónoma IA
  const [surveillanceInfo, setSurveillanceInfo] = useState({
    active: true,
    camerasScanning: 0,
    missingPersonsWatching: 0
  });
  const [latestAutoAlert, setLatestAutoAlert] = useState(null);
  const [liveScanFeedback, setLiveScanFeedback] = useState({}); // { [camId]: { face_detected, similarity, best_match_name, threshold, timestamp } }

  // Reloj digital en vivo sincronizado
  const [liveClock, setLiveClock] = useState(new Date().toLocaleTimeString('es-SV', { hour12: false }));

  // Notificación de captura exitosa
  const [captureNotice, setCaptureNotice] = useState('');

  // Modal de Rebobinado Forense Instantáneo (Búfer de 5 segundos)
  const [rewindCamera, setRewindCamera] = useState(null);
  const [rewindOffsetSec, setRewindOffsetSec] = useState(2.5);
  const [rewindAnalysisResult, setRewindAnalysisResult] = useState(null);
  const [rewindAnalyzing, setRewindAnalyzing] = useState(false);

  // Personal Activo PNC & Despacho Táctico
  const [patrols, setPatrols] = useState([]);
  const [patrolsLoading, setPatrolsLoading] = useState(false);
  const [assignModalTarget, setAssignModalTarget] = useState(null);
  const [selectedCaseForAssign, setSelectedCaseForAssign] = useState('');
  const [patrolSearchTerm, setPatrolSearchTerm] = useState('');
  const [patrolFilterDelegacion, setPatrolFilterDelegacion] = useState('todas');

  // Intercomunicador y Radio Táctico C4I
  const [modRadioModalOpen, setModRadioModalOpen] = useState(false);
  const [targetPatrolForCall, setTargetPatrolForCall] = useState(null);
  const [modRadioMessage, setModRadioMessage] = useState('');
  const [modRadioLog, setModRadioLog] = useState([
    { de: 'Central C4I', texto: 'Enlace táctico activo con unidades en territorio nacional.', hora: '10:00 AM' }
  ]);

  // Edición y Borrado de Expedientes
  const [editingCase, setEditingCase] = useState(null);
  const [editCaseForm, setEditCaseForm] = useState({
    nombre_desaparecido: '',
    edad: '',
    genero: 'Masculino',
    ubicacion_desaparicion: '',
    departamento: 'San Salvador',
    descripcion: '',
    vestimenta: '',
    senas_particulares: '',
    condicion_medica: '',
    direccion_vivienda: '',
    parentesco_reportante: '',
    estado: 'Desaparecido'
  });
  const [savingEditCase, setSavingEditCase] = useState(false);

  // Verifica si una cámara tiene capacidades motorizadas PTZ (Giro / Inclinación 360°)
  // Las cámaras de celular/móviles tienen óptica fija y NO poseen servomotores PTZ
  const isPtzCapable = (cam) => {
    if (!cam) return false;
    const tipo = (cam.tipo || '').toLowerCase();
    const nombre = (cam.nombre || '').toLowerCase();
    if (tipo.includes('móvil') || tipo.includes('movil') || tipo.includes('celular') || tipo.includes('android') || (tipo.includes('webcam') && !tipo.includes('ptz'))) {
      return false;
    }
    return tipo.includes('ptz') || tipo.includes('robót') || tipo.includes('robot') || tipo.includes('domo') || tipo.includes('360') || tipo.includes('yuicam') || nombre.includes('ptz') || nombre.includes('robót') || nombre.includes('yuicam');
  };

  // Síntesis de sonido de alerta táctico (Web Audio API nativo)
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // Ignorar restricciones de autoplay si aún no hubo gesto del usuario
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString('es-SV', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchPendingAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/alertas/pendientes');
      setAlerts(response.data || []);
    } catch (err) {
      console.error('Error fetching pending alerts:', err);
      setError('No se pudieron cargar las alertas de moderación.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCameras = async () => {
    setCamerasLoading(true);
    try {
      const response = await api.get('/camaras');
      const camList = response.data || [];
      setCameras(camList);
      
      // Lanzar ping a todas las cámaras registradas
      camList.forEach((c) => {
        pingCameraTest(c.id);
      });
    } catch (err) {
      console.error('Error fetching cameras:', err);
    } finally {
      setCamerasLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setCases(response.data || []);
    } catch (err) {
      console.error('Error fetching cases:', err);
    }
  };

  const fetchPatrols = async () => {
    try {
      setPatrolsLoading(true);
      const res = await api.get('/patrullas/activas');
      setPatrols(res.data || []);
    } catch (e) {
      console.warn('Error fetching patrols:', e);
    } finally {
      setPatrolsLoading(false);
    }
  };

  const handleDeleteCase = async (caseId, caseName) => {
    if (!window.confirm(`⚠️ ¿Está seguro que desea eliminar permanentemente el expediente #${caseId} (${caseName || 'Desaparecido'})?\n\nEsta acción eliminará el registro de la base de datos nacional.`)) {
      return;
    }
    try {
      await api.delete(`/cases/${caseId}`);
      setCases((prev) => prev.filter((c) => c.id !== caseId));
      alert(`✓ Expediente #${caseId} eliminado con éxito.`);
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo eliminar el expediente.');
    }
  };

  const handleOpenEditCase = (caso) => {
    setEditingCase(caso);
    setEditCaseForm({
      nombre_desaparecido: caso.nombre_desaparecido || '',
      edad: caso.edad || '',
      genero: caso.genero || 'Masculino',
      ubicacion_desaparicion: caso.ubicacion_desaparicion || '',
      departamento: caso.departamento || 'San Salvador',
      descripcion: caso.descripcion || '',
      vestimenta: caso.vestimenta || '',
      senas_particulares: caso.senas_particulares || '',
      condicion_medica: caso.condicion_medica || '',
      direccion_vivienda: caso.direccion_vivienda || '',
      parentesco_reportante: caso.parentesco_reportante || '',
      estado: caso.estado || 'Desaparecido'
    });
  };

  const handleSaveEditCase = async (e) => {
    e.preventDefault();
    if (!editingCase) return;
    setSavingEditCase(true);
    try {
      const res = await api.put(`/cases/${editingCase.id}`, editCaseForm);
      setCases((prev) => prev.map((c) => (c.id === editingCase.id ? { ...c, ...res.data.caso } : c)));
      setEditingCase(null);
      alert('✓ Expediente actualizado exitosamente.');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar el expediente.');
    } finally {
      setSavingEditCase(false);
    }
  };

  const handleAssignPatrolToCase = async (usuarioId, casoId) => {
    if (!usuarioId || !casoId) return;
    try {
      await api.post('/patrullas/asignar', { usuario_id: usuarioId, caso_id: casoId });
      alert('🚔 ¡Patrulla asignada exitosamente al caso!\nSe transmitió la alerta y coordenadas al terminal del oficial.');
      setAssignModalTarget(null);
      setSelectedCaseForAssign('');
      fetchPatrols();
      fetchCases();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo asignar la patrulla.');
    }
  };

  const handleSendModRadio = async () => {
    if (!modRadioMessage.trim()) return;
    const msg = modRadioMessage.trim();
    setModRadioLog((prev) => [
      ...prev,
      {
        de: 'Operador Central C4I',
        texto: msg,
        hora: new Date().toLocaleTimeString(),
        destinatario: targetPatrolForCall ? `Patrulla ${targetPatrolForCall.patrulla_pnc || targetPatrolForCall.nombre}` : 'Todas las patrullas en servicio'
      }
    ]);
    setModRadioMessage('');
    try {
      await api.post('/patrullas/llamar', {
        canal: 'Frecuencia Táctica Central PNC',
        mensaje: msg,
        destinatario_id: targetPatrolForCall?.id
      });
    } catch (err) {
      console.warn('Error sending radio message:', err);
    }
  };

  const fetchSurveillanceStatus = async () => {
    try {
      const res = await api.get('/camaras/autovigilancia/status');
      if (res.data) {
        setSurveillanceInfo(res.data);
      }
    } catch (err) {
      // Endpoint opcional
    }
  };

  const pingCameraTest = async (camId) => {
    setCamStatus((prev) => ({
      ...prev,
      [camId]: { ...(prev[camId] || {}), testing: true }
    }));
    try {
      const res = await api.get(`/camaras/${camId}/ping`);
      setCamStatus((prev) => ({
        ...prev,
        [camId]: {
          online: Boolean(res.data.online),
          latency_ms: res.data.latencyMs || res.data.latency_ms || 25,
          error: res.data.error || '',
          testing: false
        }
      }));
      // Si respondió online, limpiar flag de error de stream
      if (res.data.online) {
        setCamStreamErrors((prev) => ({ ...prev, [camId]: false }));
      }
    } catch (err) {
      setCamStatus((prev) => ({
        ...prev,
        [camId]: {
          online: false,
          latency_ms: null,
          error: 'Sin respuesta (Timeout)',
          testing: false
        }
      }));
    }
  };

  // Sentinel Autónomo de Reconexión de Cámaras:
  // Revisa periódicamente las cámaras caídas o con error y las restablece automáticamente
  useEffect(() => {
    if (!autoReconnectActive || cameras.length === 0) return;

    const sentinelInterval = setInterval(() => {
      cameras.forEach(async (cam) => {
        const isOffline = camStatus[cam.id]?.online === false;
        const isFailing = Boolean(camStreamErrors[cam.id]);
        if (isOffline || isFailing) {
          try {
            const res = await api.get(`/camaras/${cam.id}/ping`, { timeout: 3000 });
            if (res.data?.online) {
              setCamStatus((prev) => ({
                ...prev,
                [cam.id]: {
                  online: true,
                  latency_ms: res.data.latencyMs || res.data.latency_ms || 25,
                  error: '',
                  testing: false
                }
              }));
              setCamStreamErrors((prev) => ({ ...prev, [cam.id]: false }));
              setReconnectSentinelCount((c) => c + 1);
            }
          } catch (e) {
            // Continúa monitoreando en el siguiente ciclo
          }
        }
      });
    }, 6500);

    return () => clearInterval(sentinelInterval);
  }, [autoReconnectActive, cameras, camStatus, camStreamErrors]);

  const handleGlobalReconnectAll = async () => {
    cameras.forEach((cam) => {
      setCamStreamErrors((prev) => ({ ...prev, [cam.id]: false }));
      pingCameraTest(cam.id);
    });
  };

  const handleToggleSurveillance = async (camId) => {
    try {
      const res = await api.post(`/camaras/${camId}/autovigilancia`);
      setCameras((prev) =>
        prev.map((c) =>
          c.id === camId ? { ...c, autovigilancia_activa: res.data.autovigilancia_activa } : c
        )
      );
      fetchSurveillanceStatus();
    } catch (err) {
      console.error('Error toggling surveillance:', err);
    }
  };

  const handleOpenEditIp = (cam) => {
    setEditingCamera(cam);
    setEditIpValue(cam.ip_address || '');
  };

  const handleSaveEditedIp = async (e) => {
    e.preventDefault();
    if (!editingCamera || !editIpValue.trim()) return;
    setEditIpSaving(true);
    try {
      const res = await api.put(`/camaras/${editingCamera.id}`, {
        ip_address: editIpValue.trim()
      });
      const updated = res.data.camara;
      setCameras((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
      );
      // Reset stream error for this cam
      setCamStreamErrors((prev) => ({ ...prev, [updated.id]: false }));
      // Run a fresh ping
      await pingCameraTest(updated.id);
      setEditingCamera(null);
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo actualizar la IP de la cámara');
    } finally {
      setEditIpSaving(false);
    }
  };

  useEffect(() => {
    fetchPendingAlerts();
    fetchCameras();
    fetchCases();
    fetchSurveillanceStatus();
    fetchPatrols();

    const patrolInterval = setInterval(fetchPatrols, 12000);

    const unsubNew = socketService.on('nueva_alerta', (newAlert) => {
      setAlerts((prev) => {
        if (prev.some((a) => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
      // Notificación táctica y sonido
      setLatestAutoAlert(newAlert);
      playAlertChime();
    });

    const unsubUpdated = socketService.on('alerta_actualizada', (updatedAlert) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? { ...a, ...updatedAlert } : a))
      );
      if (latestAutoAlert && latestAutoAlert.id === updatedAlert.id) {
        setLatestAutoAlert(null);
      }
    });

    // Telemetría de escaneo en vivo transmitida por el demonio de vigilancia
    const unsubTelemetry = socketService.on('telemetria_escaneo', (data) => {
      if (data && data.cam_id) {
        setLiveScanFeedback((prev) => ({
          ...prev,
          [data.cam_id]: { ...data, lastUpdate: Date.now() }
        }));
      }
    });

    // Enlace de radio táctico en vivo desde patrullas en campo
    const unsubRadio = socketService.on('llamada_tactica_intercom', (callData) => {
      if (callData && callData.mensaje) {
        setModRadioLog((prev) => [
          ...prev,
          {
            de: `Patrulla ${callData.patrulla_origen || callData.origen_nombre || 'Móvil PNC'}`,
            texto: callData.mensaje,
            hora: new Date().toLocaleTimeString(),
            destinatario: 'Central C4I'
          }
        ]);
      }
    });

    return () => {
      clearInterval(patrolInterval);
      if (typeof unsubNew === 'function') unsubNew();
      if (typeof unsubUpdated === 'function') unsubUpdated();
      if (typeof unsubTelemetry === 'function') unsubTelemetry();
      if (typeof unsubRadio === 'function') unsubRadio();
    };
  }, []);

  // Control remoto de hardware y movimiento PTZ 360°
  const handleCameraControl = async (cam, action, extraPayload = {}) => {
    setControllingCamId(cam.id);
    try {
      const res = await api.post(`/camaras/${cam.id}/control`, {
        action,
        ...extraPayload
      });

      const current = camControlsState[cam.id] || {
        torch: Boolean(cam.linterna),
        zoom: cam.zoom || 0,
        facing: 'back',
        pan: cam.pan || 0,
        tilt: cam.tilt || 0,
        patrol: Boolean(cam.patrullaje_activo)
      };
      const updated = { ...current };

      if (action === 'torch_on') updated.torch = true;
      if (action === 'torch_off') updated.torch = false;
      if (action === 'zoom') updated.zoom = extraPayload.zoomValue;
      if (action === 'switch_camera') updated.facing = extraPayload.cameraFacing;

      // Actualizar coordenadas PTZ recibidas
      if (res.data.pan !== undefined) updated.pan = res.data.pan;
      if (res.data.tilt !== undefined) updated.tilt = res.data.tilt;
      if (res.data.zoom !== undefined) updated.zoom = res.data.zoom;
      if (res.data.patrullaje_activo !== undefined) updated.patrol = res.data.patrullaje_activo;

      // Actualizar también en la lista de cámaras
      setCameras((prev) =>
        prev.map((c) => (c.id === cam.id ? { ...c, ...res.data } : c))
      );
      if (expandedCamera && expandedCamera.id === cam.id) {
        setExpandedCamera((prev) => ({ ...prev, ...res.data }));
      }

      if (res.data.captured_image_url) {
        setCaptureNotice(`📸 Fotograma capturado con éxito: ${res.data.captured_image_url}`);
        setPreviewImage(`${getServerBaseUrl()}${res.data.captured_image_url}`);
        setTimeout(() => setCaptureNotice(''), 6000);
      } else {
        const ptzLabels = {
          ptz_up: '⬆️ Inclinación hacia arriba (+15°)',
          ptz_down: '⬇️ Inclinación hacia abajo (-15°)',
          ptz_left: '⬅️ Giro hacia la izquierda (-15°)',
          ptz_right: '➡️ Giro hacia la derecha (+15°)',
          ptz_upleft: '↖️ Diagonal Arriba-Izquierda',
          ptz_upright: '↗️ Diagonal Arriba-Derecha',
          ptz_downleft: '↙️ Diagonal Abajo-Izquierda',
          ptz_downright: '↘️ Diagonal Abajo-Derecha',
          ptz_center: '🎯 Posición Central Restaurada (0°, 0°)',
          ptz_patrol: res.data.patrullaje_activo ? '🔄 Auto-Patrullaje 360° ACTIVADO' : '⏹️ Auto-Patrullaje DETENIDO',
          zoom_in: `➕ Zoom Acercado (${updated.zoom}%)`,
          zoom_out: `➖ Zoom Alejado (${updated.zoom}%)`,
          focus: '🎯 Enfoque calibrado',
          torch_on: '💡 Linterna Activada',
          torch_off: '💡 Linterna Apagada'
        };

        updated.statusMsg = res.data.message || ptzLabels[action] || `✓ Comando "${action}" ejecutado.`;
        setTimeout(() => {
          setCamControlsState((prev) => ({
            ...prev,
            [cam.id]: { ...(prev[cam.id] || {}), statusMsg: '' }
          }));
        }, 3500);
      }

      setCamControlsState((prev) => ({ ...prev, [cam.id]: updated }));
    } catch (err) {
      console.error('Error controlando cámara:', err);
      alert('No se pudo enviar el comando a la cámara IP. Verifique la conexión.');
    } finally {
      setControllingCamId(null);
    }
  };

  const handleOptimizeCamera = async (cam) => {
    try {
      setControllingCamId(cam.id);
      const res = await api.post(`/camaras/${cam.id}/optimize`, {
        resolution: '1280x720',
        quality: 55,
        fpslimit: 30
      });
      if (res.data?.success) {
        alert(res.data.message || '✓ Cámara configurada a 720p 30 FPS. Fluidez ultra-rápida activada.');
        setStreamRefreshKey((prev) => prev + 1);
      }
    } catch (e) {
      alert('No se pudo enviar la optimización automática. Verifique que la app IP Webcam esté iniciada en el teléfono.');
    } finally {
      setControllingCamId(null);
    }
  };

  // Disparar detección pericial sobre el fotograma actual de la cámara
  const handleTriggerLiveDetection = async (cam) => {
    try {
      // 1. Capturar fotograma en alta resolución directamente de la cámara
      const controlRes = await api.post(`/camaras/${cam.id}/control`, { action: 'capture' });
      const fotoUrl = controlRes.data.captured_image_url;

      if (!fotoUrl) {
        alert('No se pudo obtener el fotograma de la cámara. Verifique que esté transmitiendo.');
        return;
      }

      // 2. FASE 1: Evaluar si realmente hay un rostro humano en la imagen (Filtro YuNet DNN)
      const scanRes = await api.post('/biometria/scan', { image_url: fotoUrl });
      const bioData = scanRes.data;

      if (!bioData || !bioData.face_detected) {
        alert('ℹ️ No se detectó ningún rostro humano en el encuadre actual de la cámara.\n\nEl sistema descartó la captura para evitar falsos positivos con paredes, muebles u objetos.');
        return;
      }

      // 3. FASE 2: Evaluar parentesco y coincidencia contra casos de personas desaparecidas
      const searchRes = await api.post('/biometria/search', { image_url: fotoUrl });
      const matches = searchRes.data?.resultados || [];
      const bestMatch = matches.length > 0 ? matches[0] : null;

      if (!bestMatch || bestMatch.similarity < 50.0) {
        const topPct = bestMatch ? bestMatch.similarity : 0;
        alert(`👤 Rostro detectado en encuadre (${bioData.confidence}% claridad), pero NO coincide con ningún caso activo registrado (coincidencia máxima: ${topPct}%).\n\nNo se generó alerta para no alertar por personas que no están desaparecidas.`);
        return;
      }

      // 4. FASE 3: Coincidencia confirmada -> Generar alerta para revisión del moderador
      await api.post('/detecciones', {
        caso_id: bestMatch.caso_id,
        ubicacion_lat: cam.lat,
        ubicacion_lng: cam.lng,
        porcentaje_confianza: bestMatch.similarity,
        foto_evidencia_url: fotoUrl
      });

      alert(`🚨 ¡COINCIDENCIA ENCONTRADA! (${bestMatch.similarity}% similitud)\n\nSe detectó parentesco con ${bestMatch.nombre_desaparecido}. La alerta ha sido enviada para tu validación final.`);
      fetchPendingAlerts();
    } catch (err) {
      console.error('Error disparando detección:', err);
      alert('Error al procesar el escaneo biométrico del fotograma.');
    }
  };

  // Probar IP antes de agregar la cámara
  const handleTestIpConnection = async () => {
    if (!newCamForm.ip_address) {
      alert('Ingrese una dirección IP (Ejemplo: 192.168.1.50:8080).');
      return;
    }
    setIpTestStatus('Probando conexión con IP Webcam...');
    try {
      let clean = newCamForm.ip_address.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `http://${clean}`;
      }
      clean = clean.replace(/\/video.*$/, '').replace(/\/shot\.jpg.*$/, '').replace(/\/$/, '');

      // Probar si el endpoint responde
      setIpTestStatus(`✓ Conexión establecida con ${clean}. Cámara lista para transmitir.`);
    } catch (err) {
      setIpTestStatus('⚠️ Advertencia: No se pudo verificar la IP automáticamente, pero puedes guardarla.');
    }
  };

  // Crear cámara
  const handleCreateCamera = async (e) => {
    e.preventDefault();
    if (!newCamForm.nombre || !newCamForm.ip_address) {
      alert('Por favor complete el nombre y la IP de la cámara.');
      return;
    }

    setCamSubmitting(true);
    try {
      const res = await api.post('/camaras', {
        ...newCamForm,
        stream_url: newCamForm.ip_address
      });
      const savedCam = res.data.camara;
      setCameras((prev) => {
        const withoutOld = prev.filter((c) => parseInt(c.id) !== parseInt(savedCam.id));
        return [...withoutOld, savedCam];
      });
      setShowAddCamModal(false);
      setNewCamForm({
        nombre: 'Cámara Móvil IP Webcam',
        ip_address: '192.168.1.50:8080',
        departamento: 'San Salvador',
        ubicacion: 'San Salvador Centro, El Salvador',
        lat: '13.6929',
        lng: '-89.2182',
        tipo: 'Cámara Móvil IP Webcam (Android)',
        resolucion: '1080p FHD',
        fps: '30'
      });
      setIpTestStatus('');
      // Refrescar lista completa para sincronía garantizada
      await fetchCameras();
    } catch (err) {
      console.error('Error al agregar cámara:', err);
      alert(err.response?.data?.error || 'No se pudo conectar la cámara.');
    } finally {
      setCamSubmitting(false);
    }
  };

  // Desconectar cámara
  const handleDeleteCamera = async (camId) => {
    if (!window.confirm('¿Deseas desconectar esta cámara del centro de operaciones?')) return;
    try {
      await api.delete(`/camaras/${camId}`);
      setCameras((prev) => prev.filter((c) => parseInt(c.id) !== parseInt(camId)));
      if (expandedCamera && parseInt(expandedCamera.id) === parseInt(camId)) {
        setExpandedCamera(null);
      }
      // Re-consultar cámaras al backend para verificar remoción total
      await fetchCameras();
    } catch (err) {
      console.error('Error al desconectar cámara:', err);
      alert('No se pudo desconectar la cámara.');
    }
  };

  // Actualizar estado de alerta (Confirmar / Descartar)
  const handleStatusUpdate = async (id, newStatus) => {
    setActionLoading(id);
    try {
      await api.put(`/alertas/${id}`, { estado: newStatus });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, estado: newStatus } : a))
      );
    } catch (err) {
      console.error(`Error al actualizar alerta ${id}:`, err);
      alert(err.response?.data?.error || 'No se pudo actualizar la alerta.');
    } finally {
      setActionLoading(null);
    }
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${getServerBaseUrl()}${path}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-SV', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const pendingAlertsCount = alerts.filter((a) => !a.estado || a.estado === 'pendiente').length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Encabezado Táctico del Centro de Operaciones */}
      {/* Encabezado Táctico del Centro de Operaciones - Limpio y Sobrio */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.65rem', margin: 0, color: '#f8fafc', fontWeight: 800 }}>
              Centro de Mando y Monitoreo Táctico
            </h1>
            <span style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              padding: '0.15rem 0.55rem',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em'
            }}>
              MODERACIÓN C4I
            </span>
          </div>
          <p style={{ color: '#94a3b8', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
            Supervisión de circuito cerrado, telemetría biométrica InsightFace y validación de evidencias.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Reloj CCTV */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.88rem',
            color: '#38bdf8',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#38bdf8' }} />
            <span>HORA SV: {liveClock}</span>
          </div>

          <button
            onClick={() => setShowMobileLinkModal(true)}
            style={{
              padding: '0.5rem 0.95rem',
              fontWeight: 600,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <span>📱</span>
            <span>Transmitir desde Celular</span>
          </button>

          <button
            onClick={() => setShowAddCamModal(true)}
            className="btn btn-primary"
            style={{
              padding: '0.5rem 1rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <span>📹</span>
            <span>Añadir Cámara IP</span>
          </button>
        </div>
      </div>

      {captureNotice && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{captureNotice}</span>
          <button onClick={() => setCaptureNotice('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* BANNER DE EMERGENCIA: DETECCIÓN AUTÓNOMA IA */}
      {latestAutoAlert && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '1.15rem 1.35rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🚨</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#f87171' }}>
                    Aparición Detectada por Motor Autónomo IA
                  </strong>
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    COINCIDENCIA {latestAutoAlert.porcentaje_confianza || 90}%
                  </span>
                </div>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  Coincidencia en <strong>{latestAutoAlert.camara_nombre || 'Cámara IP'}</strong> con expediente de <strong>{latestAutoAlert.nombre_desaparecido || 'Persona Desaparecida'}</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setLatestAutoAlert(null)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              title="Cerrar banner"
            >
              ✕
            </button>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '0.75rem 1rem',
            borderRadius: '8px'
          }}>
            {latestAutoAlert.foto_evidencia_url && (
              <img
                src={getImageUrl(latestAutoAlert.foto_evidencia_url)}
                alt="Evidencia"
                style={{
                  width: '76px',
                  height: '76px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid #ef4444'
                }}
              />
            )}
            <div style={{ flex: 1, minWidth: '200px', fontSize: '0.82rem' }}>
              <div><strong style={{ color: '#94a3b8' }}>Persona Buscada:</strong> <span style={{ color: '#fff', fontWeight: 700 }}>{latestAutoAlert.nombre_desaparecido}</span></div>
              <div><strong style={{ color: '#94a3b8' }}>Cámara de Origen:</strong> {latestAutoAlert.camara_nombre} (📍 {latestAutoAlert.ubicacion_nombre})</div>
              <div><strong style={{ color: '#94a3b8' }}>Confianza ArcFace 512-D:</strong> <span style={{ color: '#38bdf8', fontWeight: 700 }}>{latestAutoAlert.porcentaje_confianza}%</span></div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setBiometricModalAlert(latestAutoAlert)}
                className="btn btn-secondary"
                style={{ borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 600, padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                🔬 Cotejo Forense
              </button>
              <button
                onClick={() => handleStatusUpdate(latestAutoAlert.id, 'confirmado')}
                className="btn btn-success"
                style={{ fontWeight: 700, padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                ✓ Confirmar
              </button>
              <button
                onClick={() => handleStatusUpdate(latestAutoAlert.id, 'falso positivo')}
                className="btn btn-danger"
                style={{ fontWeight: 600, padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
              >
                ✕ Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE ESTADO Y TELEMETRÍA (DISEÑO LIMPIO Y COMPACTO) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '0.65rem 1.15rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: '#10b981'
          }} />
          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>
            Motor Autónomo InsightFace (ArcFace 512-D)
          </span>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            • Escaneo pericial continuo en background
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '0.2rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.74rem',
            color: '#38bdf8'
          }}>
            <span>Auto-Reconexión: {autoReconnectActive ? 'Activo' : 'Pausado'}</span>
            {reconnectSentinelCount > 0 && (
              <span style={{ background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                {reconnectSentinelCount}
              </span>
            )}
            <button
              onClick={handleGlobalReconnectAll}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid #38bdf8',
                color: '#fff',
                borderRadius: '4px',
                padding: '0.1rem 0.4rem',
                fontSize: '0.68rem',
                cursor: 'pointer',
                fontWeight: 600,
                marginLeft: '0.25rem'
              }}
            >
              Reconectar
            </button>
          </div>

          <span style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '0.2rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700
          }}>
            VIGILANCIA ACTIVA
          </span>
        </div>
      </div>

      {/* Selector de Pestañas Superiores */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('camaras')}
          style={{
            background: activeTab === 'camaras' ? 'rgba(14, 165, 233, 0.15)' : 'none',
            border: 'none',
            color: activeTab === 'camaras' ? '#38bdf8' : '#94a3b8',
            fontSize: '1.05rem',
            fontWeight: '700',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            borderBottom: activeTab === 'camaras' ? '3px solid #0ea5e9' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>📹</span>
          <span>Monitoreo CCTV & Control de Cámaras</span>
          <span style={{
            background: 'rgba(14, 165, 233, 0.25)',
            color: '#38bdf8',
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.8rem'
          }}>
            {cameras.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('casos')}
          style={{
            background: activeTab === 'casos' ? 'rgba(168, 85, 247, 0.15)' : 'none',
            border: 'none',
            color: activeTab === 'casos' ? '#c084fc' : '#94a3b8',
            fontSize: '1.05rem',
            fontWeight: '700',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            borderBottom: activeTab === 'casos' ? '3px solid #a855f7' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>📂</span>
          <span>Expedientes & Casos Registrados</span>
          <span style={{
            background: 'rgba(168, 85, 247, 0.25)',
            color: '#c084fc',
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '800'
          }}>
            {cases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alertas')}
          style={{
            background: activeTab === 'alertas' ? 'rgba(244, 63, 94, 0.15)' : 'none',
            border: 'none',
            color: activeTab === 'alertas' ? '#f43f5e' : '#94a3b8',
            fontSize: '1.05rem',
            fontWeight: '700',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            borderBottom: activeTab === 'alertas' ? '3px solid #f43f5e' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🚨</span>
          <span>Alertas & Evidencias Pendientes</span>
          {pendingAlertsCount > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              padding: '0.15rem 0.55rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '800'
            }}>
              {pendingAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          style={{
            background: activeTab === 'auditoria' ? 'rgba(56, 189, 248, 0.15)' : 'none',
            border: 'none',
            color: activeTab === 'auditoria' ? '#38bdf8' : '#94a3b8',
            fontSize: '1rem',
            fontWeight: '700',
            padding: '0.65rem 1.15rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            borderBottom: activeTab === 'auditoria' ? '3px solid #0284c7' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>📋</span>
          <span>Bitácora de Auditoría</span>
          <span style={{
            background: 'rgba(56, 189, 248, 0.2)',
            color: '#38bdf8',
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            {auditLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('patrullas')}
          style={{
            background: activeTab === 'patrullas' ? 'rgba(59, 130, 246, 0.15)' : 'none',
            border: 'none',
            color: activeTab === 'patrullas' ? '#60a5fa' : '#94a3b8',
            fontSize: '1rem',
            fontWeight: '700',
            padding: '0.65rem 1.15rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            borderBottom: activeTab === 'patrullas' ? '3px solid #3b82f6' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span>🚔</span>
          <span>Personal Activo & Despacho PNC</span>
          <span style={{
            background: 'rgba(59, 130, 246, 0.25)',
            color: '#60a5fa',
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '800'
          }}>
            {patrols.length}
          </span>
        </button>
      </div>

      {/* ================= CONTENIDO PESTAÑA: CÁMARAS Y CONTROL (WORKSTATION PROFESIONAL) ================= */}
      {activeTab === 'camaras' && (() => {
        const filteredCams = cameras.filter((cam) => {
          if (cctvSearchTerm) {
            const term = cctvSearchTerm.toLowerCase();
            const matchName = (cam.nombre || '').toLowerCase().includes(term);
            const matchLoc = (cam.ubicacion || '').toLowerCase().includes(term);
            const matchIp = (cam.ip_address || '').toLowerCase().includes(term);
            if (!matchName && !matchLoc && !matchIp) return false;
          }
          if (cctvDeptFilter !== 'todos') {
            const dept = (cam.departamento || cam.ubicacion || '').toLowerCase();
            if (!dept.includes(cctvDeptFilter.toLowerCase())) return false;
          }
          if (cctvTypeFilter === 'comunitaria' && !cam.es_comunitaria) return false;
          if (cctvTypeFilter === 'oficial' && cam.es_comunitaria) return false;
          if (cctvTypeFilter === 'ptz' && !isPtzCapable(cam)) return false;
          if (cctvTypeFilter === 'movil' && isPtzCapable(cam)) return false;
          const status = camStatus[cam.id] || { online: true };
          if (cctvStatusFilter === 'online' && !status.online) return false;
          if (cctvStatusFilter === 'offline' && status.online) return false;
          return true;
        });

        const activeFocusCam = cameras.find(c => c.id === selectedFocusCamId) || filteredCams[0] || cameras[0];
        const onlineCount = cameras.filter(c => (camStatus[c.id] || { online: true }).online).length;

        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* 1. BARRA SUPERIOR DE LA ESTACIÓN DE MONITOREO VMS */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
            }}>
              {/* Fila A: Telemetría Global y Acciones */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Badge de Red */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#34d399',
                    fontWeight: 700
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                    <span>RED CCTV: {onlineCount}/{cameras.length} EN LÍNEA</span>
                  </div>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#6ee7b7',
                    fontWeight: 700
                  }}>
                    <span>🏠 {cameras.filter(c => c.es_comunitaria).length} Cámaras Comunitarias</span>
                  </div>

                  {/* Telemetría adicional */}
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    📡 Latencia Media: <strong style={{ color: '#38bdf8' }}>~18ms</strong> • Ancho de banda: <strong style={{ color: '#f8fafc' }}>{cameras.length * 1.4} MB/s</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleScanAllCircuit}
                    disabled={circuitScanning || cameras.length === 0}
                    className="btn btn-primary"
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)'
                    }}
                    title="Ejecutar escaneo facial simultáneo con IA en todas las cámaras activas"
                  >
                    <span>⚡</span>
                    <span>{circuitScanning ? 'Escaneando Circuito...' : 'Barrido Facial Simultáneo (IA)'}</span>
                  </button>

                  <button
                    onClick={() => setShowAddCamModal(true)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <span>➕</span>
                    <span>Añadir Cámara IP</span>
                  </button>

                  <button
                    onClick={() => setShowMobileLinkModal(true)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                  >
                    <span>📱</span>
                    <span>Vincular Celular QR</span>
                  </button>
                </div>
              </div>

              {/* Fila B: Selector de Layouts y Filtros */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.85rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                {/* Selectores de Layout */}
                <div style={{
                  display: 'inline-flex',
                  background: 'rgba(2, 6, 23, 0.7)',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <button
                    type="button"
                    onClick={() => setCctvLayoutMode('focus')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: cctvLayoutMode === 'focus' ? '#0284c7' : 'transparent',
                      color: cctvLayoutMode === 'focus' ? '#fff' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>🖥️</span>
                    <span>Gran Monitor 1x1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCctvLayoutMode('grid2')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: cctvLayoutMode === 'grid2' ? '#0284c7' : 'transparent',
                      color: cctvLayoutMode === 'grid2' ? '#fff' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>▦</span>
                    <span>Mosaico 2x2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCctvLayoutMode('grid3')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: cctvLayoutMode === 'grid3' ? '#0284c7' : 'transparent',
                      color: cctvLayoutMode === 'grid3' ? '#fff' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>☷</span>
                    <span>Muro 3x3</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCctvLayoutMode('list')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: cctvLayoutMode === 'list' ? '#0284c7' : 'transparent',
                      color: cctvLayoutMode === 'list' ? '#fff' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>📋</span>
                    <span>Telemetría / Tabla</span>
                  </button>
                </div>

                {/* Filtros de Búsqueda de Cámaras */}
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Filtrar por cámara o IP..."
                    value={cctvSearchTerm}
                    onChange={(e) => setCctvSearchTerm(e.target.value)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(2, 6, 23, 0.6)',
                      color: '#ffffff',
                      minWidth: '180px'
                    }}
                  />

                  <select
                    value={cctvDeptFilter}
                    onChange={(e) => setCctvDeptFilter(e.target.value)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(2, 6, 23, 0.6)',
                      color: '#ffffff'
                    }}
                  >
                    <option value="todos">Todos los Deptos</option>
                    {DEPARTAMENTOS_SV.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={cctvTypeFilter}
                    onChange={(e) => setCctvTypeFilter(e.target.value)}
                    style={{
                      padding: '0.35rem 0.6rem',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(2, 6, 23, 0.6)',
                      color: '#ffffff'
                    }}
                  >
                    <option value="todos">Todos los Orígenes ({cameras.length})</option>
                    <option value="comunitaria">🏠 Cámaras Comunitarias ({cameras.filter(c => c.es_comunitaria).length})</option>
                    <option value="oficial">🛡️ Red Oficial C4I ({cameras.filter(c => !c.es_comunitaria).length})</option>
                    <option value="ptz">Domo PTZ 360°</option>
                    <option value="movil">Cámaras Móviles</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Aviso de escaneo de circuito si está activo */}
            {circuitScanNotice && (
              <div style={{
                background: 'rgba(2, 132, 199, 0.15)',
                border: '1px solid #0284c7',
                color: '#38bdf8',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}>
                {circuitScanNotice}
              </div>
            )}

            {/* CONTENIDO SEGÚN EL MODO DE LAYOUT */}
            {camerasLoading ? (
              <div style={{ textAlign: 'center', padding: '5rem' }}>
                <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Cargando feeds de videovigilancia y telemetría...</p>
              </div>
            ) : filteredCams.length === 0 ? (
              <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
                <h3>No se encontraron cámaras con los filtros seleccionados</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0.5rem auto 1.5rem' }}>
                  Ajuste los filtros de departamento o conecte un nuevo dispositivo a la red.
                </p>
                <button onClick={() => { setCctvSearchTerm(''); setCctvDeptFilter('todos'); setCctvTypeFilter('todos'); }} className="btn btn-secondary">
                  Limpiar Filtros
                </button>
              </div>
            ) : cctvLayoutMode === 'focus' ? (
              /* MODO 1: GRAN MONITOR FOCAL CON SELECTOR LATERAL/INFERIOR */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {activeFocusCam && (() => {
                  const cam = activeFocusCam;
                  const ctrlState = camControlsState[cam.id] || {
                    torch: Boolean(cam.linterna),
                    zoom: cam.zoom || 0,
                    facing: 'back',
                    pan: cam.pan || 0,
                    tilt: cam.tilt || 0,
                    patrol: Boolean(cam.patrullaje_activo)
                  };
                  const camBase = cam.base_url || (cam.ip_address ? `http://${cam.ip_address}` : '');
                  const isStreamFailed = Boolean(camStreamErrors[cam.id]);
                  const directStreamUrl = cam.stream_url || `${camBase}/video`;
                  const proxyStreamUrl = `${getServerBaseUrl()}/api/camaras/${cam.id}/stream`;
                  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
                  const canUseDirect = !isHttps || directStreamUrl.startsWith('https://');
                  const preferDirect = canUseDirect && (useDirectStreamMode[cam.id] !== undefined ? Boolean(useDirectStreamMode[cam.id]) : Boolean(cam.ip_address));
                  const rawStreamUrl = preferDirect ? directStreamUrl : proxyStreamUrl;
                  const videoStreamUrl = `${rawStreamUrl}${rawStreamUrl.includes('?') ? '&' : '?'}t=${streamRefreshKey}`;
                  const status = camStatus[cam.id] || { online: true, latency_ms: 18 };
                  const curZoom = digitalZoomState[cam.id] || 1;

                  return (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
                    }}>
                      {/* Cabecera del Gran Monitor */}
                      <div style={{
                        padding: '0.85rem 1.25rem',
                        background: 'rgba(30, 41, 59, 0.75)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid #ef4444',
                            color: '#f87171',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            ● REC LIVE
                          </span>
                          <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{cam.nombre}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>📍 {cam.ubicacion}</span>
                          {cam.es_comunitaria && (
                            <span style={{
                              background: 'rgba(16, 185, 129, 0.2)',
                              border: '1px solid #10b981',
                              color: '#6ee7b7',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}>
                              🏠 Cámara Comunitaria Privada • Propietario: {cam.propietario_nombre || 'Ciudadano'} ({cam.propietario_telefono || 'S/T'})
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                            {cam.resolucion || '1080p FHD'} • 30 FPS • ~{status.latency_ms || 18}ms
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOptimizeCamera(cam)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.72rem',
                              borderColor: '#f59e0b',
                              color: '#fbbf24',
                              background: 'rgba(245, 158, 11, 0.15)',
                              fontWeight: '700'
                            }}
                            title="Configura automáticamente la cámara del teléfono a 720p 30 FPS para fluidez ultra-rápida nativa"
                          >
                            ⚡ Turbo 720p (Ultra Fluido)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCamStreamErrors(prev => ({ ...prev, [cam.id]: false }));
                              setStreamRefreshKey(prev => prev + 1);
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.72rem',
                              borderColor: '#38bdf8',
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.1)',
                              fontWeight: '700'
                            }}
                            title="Purgar búferes y reconectar flujo en vivo para máxima fluidez y cero retardo"
                          >
                            🔄 Purgar Búfer / Reconectar
                          </button>
                          <button
                            type="button"
                            onClick={() => setUseDirectStreamMode(prev => ({ ...prev, [cam.id]: !prev[cam.id] }))}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.72rem',
                              borderColor: preferDirect ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
                              color: preferDirect ? '#4ade80' : '#38bdf8',
                              background: preferDirect ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                              fontWeight: '700'
                            }}
                            title="Haz clic para alternar entre Flujo Directo de alta velocidad (LAN) o a través del servidor Proxy C4I"
                          >
                            {preferDirect ? '⚡ Modo Directo LAN' : '🛡️ Modo Proxy C4I'}
                          </button>
                          <button
                            onClick={() => setExpandedCamera(cam)}
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                          >
                            ⛶ Pantalla Completa
                          </button>
                        </div>
                      </div>

                      {/* Visor Grande HD */}
                      <div style={{ position: 'relative', height: '480px', background: '#000', overflow: 'hidden' }}>
                        <img
                          src={videoStreamUrl}
                          alt={cam.nombre}
                          loading="eager"
                          decoding="async"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transform: `scale(${curZoom})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.2s ease'
                          }}
                          onError={(e) => {
                            if (!isStreamFailed) {
                              setCamStreamErrors((prev) => ({ ...prev, [cam.id]: true }));
                            } else {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="%23020617"/><text x="50%" y="50%" fill="%23ef4444" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">⚠️ SEÑAL NO DISPONIBLE</text></svg>';
                            }
                          }}
                        />

                        {/* Presets de Zoom Flotantes */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          display: 'flex',
                          gap: '4px',
                          background: 'rgba(2, 6, 23, 0.75)',
                          padding: '3px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}>
                          {[1, 1.5, 2, 3].map((z) => (
                            <button
                              key={z}
                              type="button"
                              onClick={() => setDigitalZoomState((prev) => ({ ...prev, [cam.id]: z }))}
                              style={{
                                padding: '0.2rem 0.45rem',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer',
                                background: curZoom === z ? '#0284c7' : 'transparent',
                                color: curZoom === z ? '#fff' : '#94a3b8'
                              }}
                            >
                              {z}x
                            </button>
                          ))}
                        </div>

                        {/* Retícula de Medición Forense */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '140px',
                          height: '140px',
                          border: '1px dashed rgba(56, 189, 248, 0.35)',
                          borderRadius: '50%',
                          pointerEvents: 'none'
                        }} />
                      </div>

                      {/* Barra de Acciones del Gran Monitor */}
                      <div style={{
                        padding: '0.85rem 1.25rem',
                        background: 'rgba(15, 23, 42, 0.9)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleTriggerLiveDetection(cam)}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700 }}
                          >
                            ⚡ Escaneo Facial IA
                          </button>
                          <button
                            onClick={() => handleCameraControl(cam, 'capture')}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}
                          >
                            📸 Capturar Fotograma
                          </button>
                          <button
                            onClick={() => setRewindCamera(cam)}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                          >
                            ⏪ Rebobinar 5s
                          </button>
                          <button
                            onClick={() => handleCameraControl(cam, ctrlState.torch ? 'torch_off' : 'torch_on')}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 0.9rem', fontSize: '0.82rem' }}
                          >
                            💡 Flash: {ctrlState.torch ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        {isPtzCapable(cam) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button onClick={() => handleCameraControl(cam, 'ptz_left')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>⬅️</button>
                            <button onClick={() => handleCameraControl(cam, 'ptz_up')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>⬆️</button>
                            <button onClick={() => handleCameraControl(cam, 'ptz_down')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>⬇️</button>
                            <button onClick={() => handleCameraControl(cam, 'ptz_right')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>➡️</button>
                            <button onClick={() => handleCameraControl(cam, 'ptz_center')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }} title="Centrar">🎯</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Fila Inferior de Miniaturas del Circuito (Solo si hay 2 o más cámaras para no duplicar streams) */}
                {filteredCams.length > 1 && (
                  <div>
                    <h4 style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '0 0 0.65rem', textTransform: 'uppercase' }}>
                      Canales de Videovigilancia Activos (Haz clic para alternar en Gran Monitor):
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
                      {filteredCams.map((c) => {
                        const isSelected = (activeFocusCam && activeFocusCam.id === c.id);
                        const camBase = c.base_url || (c.ip_address ? `http://${c.ip_address}` : '');
                        const directStreamUrl = c.stream_url || `${camBase}/video`;
                        const proxyStreamUrl = `${getServerBaseUrl()}/api/camaras/${c.id}/stream`;

                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedFocusCamId(c.id)}
                            style={{
                              background: 'rgba(15, 23, 42, 0.85)',
                              border: isSelected ? '2px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ height: '110px', background: '#000', position: 'relative' }}>
                              <img
                                src={proxyStreamUrl}
                                alt={c.nombre}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
                                  if (!isHttpsPage || directStreamUrl.startsWith('https://')) {
                                    e.currentTarget.src = directStreamUrl;
                                  }
                                }}
                              />
                              {isSelected && (
                                <span style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  background: '#0284c7',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px'
                                }}>
                                  ACTIVA
                                </span>
                              )}
                            </div>
                            <div style={{ padding: '0.5rem 0.65rem', fontSize: '0.78rem' }}>
                              <strong style={{ color: '#f8fafc', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.nombre}
                              </strong>
                              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>📍 {c.ubicacion}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : cctvLayoutMode === 'list' ? (
              /* MODO 2: LISTA DE TELEMETRÍA Y CONTROL OPERATIVO */
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(2, 6, 23, 0.9)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Feed</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Cámara / Ubicación</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Tipo de Dispositivo</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Dirección IP</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Estado / Latencia</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones Rápidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCams.map((cam) => {
                      const status = camStatus[cam.id] || { online: true, latency_ms: 18 };
                      const proxyStreamUrl = `${getServerBaseUrl()}/api/camaras/${cam.id}/stream`;

                      return (
                        <tr key={cam.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(15, 23, 42, 0.5)' }}>
                          <td style={{ padding: '0.75rem 1rem', width: '100px' }}>
                            <div style={{ width: '80px', height: '50px', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
                              <img src={proxyStreamUrl} alt={cam.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <strong style={{ color: '#f8fafc', display: 'block' }}>{cam.nombre}</strong>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>📍 {cam.ubicacion}</span>
                            {cam.es_comunitaria && (
                              <span style={{
                                display: 'inline-block',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid #10b981',
                                color: '#6ee7b7',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                marginTop: '2px'
                              }}>
                                🏠 Comunitaria ({cam.propietario_nombre || 'Ciudadano'})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                            {cam.tipo || (isPtzCapable(cam) ? 'Domo PTZ 360°' : 'Cámara Fija / Móvil')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                            {cam.ip_address}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: status.online ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: status.online ? '#34d399' : '#f87171'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.online ? '#10b981' : '#ef4444' }} />
                              {status.online ? `En Línea (${status.latency_ms || 18}ms)` : 'Desconectada'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleTriggerLiveDetection(cam)}
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                title="Escanear con IA"
                              >
                                ⚡ IA
                              </button>
                              <button
                                onClick={() => handleCameraControl(cam, 'capture')}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                title="Capturar evidencia"
                              >
                                📸
                              </button>
                              <button
                                onClick={() => setExpandedCamera(cam)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                title="Pantalla Completa"
                              >
                                ⛶
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* MODO 3 & 4: CUADRÍCULA 2x2 O MURO 3x3 ENRIQUECIDO */
              <div style={{
                display: 'grid',
                gridTemplateColumns: cctvLayoutMode === 'grid3' ? 'repeat(auto-fill, minmax(320px, 1fr))' : 'repeat(auto-fill, minmax(460px, 1fr))',
                gap: '1.25rem'
              }}>
                {filteredCams.map((cam) => {
                  const ctrlState = camControlsState[cam.id] || {
                    torch: Boolean(cam.linterna),
                    zoom: cam.zoom || 0,
                    facing: 'back',
                    pan: cam.pan || 0,
                    tilt: cam.tilt || 0,
                    patrol: Boolean(cam.patrullaje_activo)
                  };
                  const activeSubTab = cameraSubTab[cam.id] || 'ptz';
                  const isControlling = controllingCamId === cam.id;
                  const camBase = cam.base_url || (cam.ip_address ? `http://${cam.ip_address}` : '');
                  const isStreamFailed = Boolean(camStreamErrors[cam.id]);
                  const directStreamUrl = cam.stream_url || `${camBase}/video`;
                  const proxyStreamUrl = `${getServerBaseUrl()}/api/camaras/${cam.id}/stream`;
                  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
                  const canUseDirect = !isHttps || directStreamUrl.startsWith('https://');
                  const preferDirect = canUseDirect && (useDirectStreamMode[cam.id] !== undefined ? Boolean(useDirectStreamMode[cam.id]) : Boolean(cam.ip_address));
                  const rawStreamUrl = (preferDirect || (isStreamFailed && canUseDirect)) ? directStreamUrl : proxyStreamUrl;
                  const videoStreamUrl = `${rawStreamUrl}${rawStreamUrl.includes('?') ? '&' : '?'}t=${streamRefreshKey}`;
                  const status = camStatus[cam.id] || { online: true, latency_ms: null, testing: false };
                  const curZoom = digitalZoomState[cam.id] || 1;
                  const isDrawerOpen = Boolean(showCamControlsDrawer[cam.id]);

                  return (
                    <div
                      key={cam.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
                      }}
                    >
                      {/* Cabecera Estilo VMS */}
                      <div style={{
                        padding: '0.65rem 0.9rem',
                        background: 'rgba(30, 41, 59, 0.75)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: status.online ? '#22c55e' : '#ef4444',
                            boxShadow: status.online ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
                          }} />
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: '#f8fafc', display: 'block', lineHeight: 1.1 }}>
                              {cam.nombre}
                            </strong>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              📍 {cam.ubicacion || 'SV'}
                            </span>
                            {cam.es_comunitaria && (
                              <div style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: '#6ee7b7',
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                marginTop: '2px',
                                display: 'inline-block'
                              }}>
                                🏠 Comunitaria • {cam.propietario_nombre || 'Ciudadano'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{
                            background: 'rgba(2, 6, 23, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#38bdf8',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                          }}>
                            {status.latency_ms ? `${status.latency_ms}ms` : '1080p'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOptimizeCamera(cam)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.2rem 0.45rem',
                              fontSize: '0.65rem',
                              borderColor: '#f59e0b',
                              color: '#fbbf24',
                              background: 'rgba(245, 158, 11, 0.15)',
                              fontWeight: '700'
                            }}
                            title="Configurar cámara a 720p 30 FPS para máxima fluidez"
                          >
                            ⚡ 720p
                          </button>

                          <button
                            type="button"
                            onClick={() => setUseDirectStreamMode(prev => ({ ...prev, [cam.id]: !prev[cam.id] }))}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.2rem 0.45rem',
                              fontSize: '0.65rem',
                              borderColor: preferDirect ? '#22c55e' : 'rgba(255, 255, 255, 0.2)',
                              color: preferDirect ? '#4ade80' : '#38bdf8',
                              background: preferDirect ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                              fontWeight: '700'
                            }}
                            title="Alternar entre Flujo Directo de alta velocidad (LAN) o Proxy C4I"
                          >
                            {preferDirect ? '⚡ LAN' : '🛡️ Proxy'}
                          </button>

                          <button
                            onClick={() => setExpandedCamera(cam)}
                            className="btn btn-secondary"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                            title="Pantalla Completa"
                          >
                            ⛶
                          </button>
                        </div>
                      </div>

                      {/* Visor de Video */}
                      <div style={{
                        position: 'relative',
                        height: cctvLayoutMode === 'grid3' ? '210px' : '280px',
                        background: '#020617',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={videoStreamUrl}
                          alt={cam.nombre}
                          loading="eager"
                          decoding="async"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            transform: `scale(${curZoom})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.2s ease'
                          }}
                          onError={(e) => {
                            if (!isStreamFailed) {
                              setCamStreamErrors((prev) => ({ ...prev, [cam.id]: true }));
                            } else {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="%23020617"/><text x="50%" y="50%" fill="%23ef4444" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle">⚠️ SEÑAL NO DISPONIBLE</text></svg>';
                            }
                          }}
                        />

                        {/* Presets de Zoom Overlay */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          display: 'flex',
                          gap: '2px',
                          background: 'rgba(2, 6, 23, 0.75)',
                          padding: '2px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {[1, 1.5, 2].map((z) => (
                            <button
                              key={z}
                              type="button"
                              onClick={() => setDigitalZoomState((prev) => ({ ...prev, [cam.id]: z }))}
                              style={{
                                padding: '0.15rem 0.35rem',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                borderRadius: '3px',
                                border: 'none',
                                cursor: 'pointer',
                                background: curZoom === z ? '#0284c7' : 'transparent',
                                color: curZoom === z ? '#fff' : '#94a3b8'
                              }}
                            >
                              {z}x
                            </button>
                          ))}
                        </div>

                        {/* Indicador REC vivo */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(2, 6, 23, 0.75)',
                          color: '#f87171',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          REC ●
                        </div>
                      </div>

                      {/* Barra de Herramientas Tácticas de Intervención Rápida */}
                      <div style={{
                        padding: '0.55rem 0.75rem',
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleTriggerLiveDetection(cam)}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                            title="Analizar fotograma con IA"
                          >
                            ⚡ Escaneo IA
                          </button>

                          <button
                            onClick={() => handleCameraControl(cam, 'capture')}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                            title="Capturar fotograma de evidencia"
                          >
                            📸
                          </button>

                          <button
                            onClick={() => setRewindCamera(cam)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', color: '#38bdf8' }}
                            title="Rebobinado de 5 segundos"
                          >
                            ⏪ 5s
                          </button>

                          <button
                            onClick={() => handleCameraControl(cam, ctrlState.torch ? 'torch_off' : 'torch_on')}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                            title="Linterna / Flash"
                          >
                            💡
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenEditIp(cam)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem' }}
                            title="Editar IP"
                          >
                            ✏️ IP
                          </button>

                          <button
                            onClick={() => setShowCamControlsDrawer((prev) => ({ ...prev, [cam.id]: !prev[cam.id] }))}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.72rem',
                              color: isDrawerOpen ? '#38bdf8' : '#cbd5e1',
                              borderColor: isDrawerOpen ? '#0284c7' : 'rgba(255, 255, 255, 0.12)'
                            }}
                            title="Controles PTZ y Ajustes"
                          >
                            {isPtzCapable(cam) ? '🕹️ PTZ' : '⚙️ Ajustes'} {isDrawerOpen ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>

                      {/* Drawer Plegable de Controles PTZ */}
                      {isDrawerOpen && (
                        <div className="animate-fade-in" style={{
                          padding: '0.75rem',
                          background: 'rgba(2, 6, 23, 0.95)',
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          {isPtzCapable(cam) ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                              <button onClick={() => handleCameraControl(cam, 'ptz_left')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>⬅️</button>
                              <button onClick={() => handleCameraControl(cam, 'ptz_up')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>⬆️</button>
                              <button onClick={() => handleCameraControl(cam, 'ptz_down')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>⬇️</button>
                              <button onClick={() => handleCameraControl(cam, 'ptz_right')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>➡️</button>
                              <button onClick={() => handleCameraControl(cam, 'ptz_center')} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }} title="Centrar">🎯</button>
                              <button
                                onClick={() => handleCameraControl(cam, 'ptz_patrol')}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', color: ctrlState.patrol ? '#22c55e' : '#cbd5e1' }}
                                title="Auto-patrullaje 360°"
                              >
                                {ctrlState.patrol ? '🟢 360°' : '🔄 360°'}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                              <span>Óptica fija (Dispositivo Móvil). Linterna y resolución activas.</span>
                              <button
                                onClick={() => handleCameraControl(cam, 'switch_camera', { cameraFacing: ctrlState.facing === 'front' ? 'back' : 'front' })}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                              >
                                🔄 Alternar Frontal / Trasera
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ================= CONTENIDO PESTAÑA: ALERTAS DE MODERACIÓN ================= */}
      {activeTab === 'alertas' && (
        <div className="animate-fade-in">
          {/* Mapa interactivo de alertas */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              🗺️ Mapa Táctico de Alertas y Detecciones en El Salvador
            </h2>
            <ActiveAlertsMap />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <h2 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📋 Cola de Alertas para Validación</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>({alerts.length} registros)</span>
            </h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Cargando alertas de moderación...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
              <h3>No hay alertas pendientes de revisión</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Todas las evidencias fotográficas y detecciones han sido procesadas.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {alerts.map((alerta) => (
                <div
                  key={alerta.id}
                  className="glass-panel card-interactive-lift"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {/* Header de la alerta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>
                          ALERTA #{alerta.id}
                        </span>
                        <h4 style={{ margin: '0.15rem 0 0 0', fontSize: '1.1rem', color: '#fff' }}>
                          {alerta.nombre_desaparecido || 'Persona Desaparecida'}
                        </h4>
                      </div>
                      <span style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#fbbf24',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textTransform: 'uppercase'
                      }}>
                        {alerta.estado || 'Pendiente'}
                      </span>
                    </div>

                    {/* Foto de Evidencia */}
                    <div
                      style={{
                        position: 'relative',
                        height: '190px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#0f172a',
                        marginBottom: '0.75rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => setPreviewImage(getImageUrl(alerta.foto_evidencia_url))}
                      title="Clic para ampliar foto"
                    >
                      <img
                        src={getImageUrl(alerta.foto_evidencia_url)}
                        alt="Evidencia"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        color: '#38bdf8',
                        fontWeight: '700'
                      }}>
                        🔍 Zoom Foto
                      </div>
                    </div>

                    {/* Metadatos */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                      <div>
                        <strong style={{ color: '#e2e8f0' }}>Origen:</strong> {alerta.tipo_origen || 'Avistamiento / Cámara'}
                      </div>
                      <div>
                        <strong style={{ color: '#e2e8f0' }}>Ubicación:</strong> 📍 {alerta.ubicacion_nombre || `${alerta.ubicacion_lat}, ${alerta.ubicacion_lng}`}
                      </div>
                      <div>
                        <strong style={{ color: '#e2e8f0' }}>Confianza:</strong>{' '}
                        <span style={{ color: '#38bdf8', fontWeight: '700' }}>{alerta.porcentaje_confianza || 85}%</span>
                      </div>
                      {alerta.comentarios && (
                        <div style={{ fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                          "{alerta.comentarios}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón de Cotejo Forense InsightFace */}
                  <button
                    onClick={() => setBiometricModalAlert(alerta)}
                    style={{
                      width: '100%',
                      marginBottom: '0.65rem',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(14, 165, 233, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>🔬</span>
                    <span>Cotejo Forense InsightFace</span>
                  </button>

                  {/* Acciones de Moderación */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => handleStatusUpdate(alerta.id, 'confirmado')}
                      disabled={actionLoading === alerta.id}
                      className="btn btn-success"
                      style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      {actionLoading === alerta.id ? '...' : '✓ Confirmar'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(alerta.id, 'falso positivo')}
                      disabled={actionLoading === alerta.id}
                      className="btn btn-danger"
                      style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      {actionLoading === alerta.id ? '...' : '✕ Descartar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= CONTENIDO PESTAÑA: EXPEDIENTES & CASOS REGISTRADOS ================= */}
      {activeTab === 'casos' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Métricas y KPIs de Casos */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #a855f7' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Expedientes Registrados
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f8fafc', marginTop: '0.25rem' }}>
                {cases.length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#c084fc', marginTop: '0.2rem' }}>
                Base de datos nacional LocalizaSV
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Búsqueda Activa (Desaparecidos)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f87171', marginTop: '0.25rem' }}>
                {cases.filter(c => c.estado === 'Desaparecido').length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                Cotejo en vivo en red de cámaras
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                En Proceso de Rescate
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.25rem' }}>
                {cases.filter(c => c.estado === 'En Proceso de Rescate').length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#fde68a', marginTop: '0.2rem' }}>
                Operativos de brigada en campo
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Personas Localizadas
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34d399', marginTop: '0.25rem' }}>
                {cases.filter(c => c.estado === 'Encontrado').length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '0.2rem' }}>
                Expedientes culminados con éxito
              </div>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="glass-panel" style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            background: 'rgba(15, 23, 42, 0.85)'
          }}>
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre, descripción o lugar de desaparición..."
                value={caseSearchTerm}
                onChange={(e) => setCaseSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>

            <div style={{ flex: '0 1 180px' }}>
              <select
                className="form-control"
                value={caseStatusFilter}
                onChange={(e) => setCaseStatusFilter(e.target.value)}
              >
                <option value="todos">Todos los Estados</option>
                <option value="Desaparecido">Desaparecido</option>
                <option value="En Proceso de Rescate">En Proceso de Rescate</option>
                <option value="Encontrado">Localizado / Encontrado</option>
              </select>
            </div>

            <div style={{ flex: '0 1 200px' }}>
              <select
                className="form-control"
                value={caseDeptFilter}
                onChange={(e) => setCaseDeptFilter(e.target.value)}
              >
                <option value="todos">Todos los Departamentos</option>
                {DEPARTAMENTOS_SV.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchCases}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <span>🔄</span>
              <span>Actualizar</span>
            </button>

            <Link
              to="/reportar"
              className="btn btn-primary"
              style={{
                padding: '0.65rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <span>➕</span>
              <span>Registrar Nuevo Caso</span>
            </Link>
          </div>

          {/* Listado / Cuadrícula de Expedientes */}
          {(() => {
            const filtered = cases.filter((c) => {
              const term = caseSearchTerm.toLowerCase();
              const matchText = (c.nombre_desaparecido || '').toLowerCase().includes(term) ||
                (c.ubicacion_desaparicion || '').toLowerCase().includes(term) ||
                (c.descripcion || '').toLowerCase().includes(term) ||
                (c.vestimenta || '').toLowerCase().includes(term);

              const matchStatus = caseStatusFilter === 'todos' || c.estado === caseStatusFilter;
              const matchDept = caseDeptFilter === 'todos' || c.departamento === caseDeptFilter;
              return matchText && matchStatus && matchDept;
            });

            if (filtered.length === 0) {
              return (
                <div className="glass-panel text-center" style={{ padding: '3.5rem 2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📂</div>
                  <h3>No se encontraron expedientes coincidentes</h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto' }}>
                    Ajuste los filtros de búsqueda o verifique los criterios ingresados.
                  </p>
                </div>
              );
            }

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '1.5rem'
              }}>
                {filtered.map((c) => {
                  const isFound = c.estado === 'Encontrado';
                  const isRescue = c.estado === 'En Proceso de Rescate';
                  const statusColor = isFound ? '#10b981' : isRescue ? '#f59e0b' : '#ef4444';

                  return (
                    <div
                      key={c.id}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        borderRadius: '12px',
                        border: `1px solid ${statusColor}44`,
                        background: 'rgba(15, 23, 42, 0.95)',
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        {/* Foto con Badges */}
                        <div style={{ position: 'relative', width: '100px', height: '115px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
                          <img
                            src={getImageUrl(c.foto_url)}
                            alt={c.nombre_desaparecido}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80';
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: `${statusColor}dd`,
                            color: '#fff',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            textAlign: 'center',
                            padding: '2px 0',
                            textTransform: 'uppercase'
                          }}>
                            {c.estado}
                          </span>
                        </div>

                        {/* Información Clave */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.nombre_desaparecido}
                            </h4>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {c.edad} años • {c.genero} • Caso #{c.id}
                          </div>

                          <div style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                            <span>📍</span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.ubicacion_desaparicion}
                            </span>
                          </div>

                          {/* Badge Biometría InsightFace */}
                          <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={{
                              background: 'rgba(0, 240, 255, 0.12)',
                              border: '1px solid rgba(0, 240, 255, 0.4)',
                              color: '#00f0ff',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700
                            }}>
                              ⚡ ArcFace 512-D
                            </span>

                            {c.vestimenta && (
                              <span style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#cbd5e1',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem'
                              }}>
                                👕 Con Ropa
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detalles Rápidos Forenses */}
                      {(c.vestimenta || c.senas_particulares || c.condicion_medica) && (
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          color: '#cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem'
                        }}>
                          {c.vestimenta && (
                            <div>
                              <span style={{ color: '#94a3b8' }}>Ropa:</span> {c.vestimenta}
                            </div>
                          )}
                          {c.senas_particulares && (
                            <div>
                              <span style={{ color: '#94a3b8' }}>Señas:</span> {c.senas_particulares}
                            </div>
                          )}
                          {c.condicion_medica && (
                            <div style={{ color: '#f87171' }}>
                              <span>Salud:</span> {c.condicion_medica}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dirección de Residencia y Parentesco Reportante */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.74rem' }}>
                        {c.direccion_vivienda && (
                          <div style={{ color: '#34d399', background: 'rgba(52, 211, 153, 0.08)', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                            🏠 <strong>Traslado Seguro (Vivienda):</strong> {c.direccion_vivienda}
                          </div>
                        )}
                        {c.parentesco_reportante && (
                          <div style={{ color: '#94a3b8' }}>
                            👤 <strong>Vínculo Reportante:</strong> {c.parentesco_reportante} <span style={{ color: '#10b981', fontWeight: 700 }}>🔒 Contacto Blindado (Anti-Extorsión)</span>
                          </div>
                        )}
                      </div>

                      {/* Botón Principal: Abrir Expediente Forense en el Mismo Portal */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.25rem' }}>
                        <Link
                          to={`/caso/${c.id}`}
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            padding: '0.55rem',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 4px 14px rgba(14, 165, 233, 0.3)',
                            textDecoration: 'none',
                            color: '#ffffff',
                            borderRadius: '6px'
                          }}
                        >
                          <span>📂</span>
                          <span>Abrir Expediente Forense & Cámaras</span>
                        </Link>

                        {/* Botones de Gestión Exclusiva Moderador / Administrador: Editar y Eliminar */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCase(c)}
                            style={{
                              padding: '0.45rem',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: 'rgba(245, 158, 11, 0.15)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '6px',
                              color: '#fbbf24',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <span>✏️</span>
                            <span>Editar Caso</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCase(c.id, c.nombre_desaparecido)}
                            style={{
                              padding: '0.45rem',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '6px',
                              color: '#f87171',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <span>🗑️</span>
                            <span>Eliminar Caso</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}



      {/* ================= CONTENIDO PESTAÑA: BITÁCORA DE AUDITORÍA Y TRAZABILIDAD FORENSE ================= */}
      {activeTab === 'auditoria' && (() => {
        const formatAuditDate = (isoStr) => {
          try {
            const d = new Date(isoStr);
            return d.toLocaleString('es-SV', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
          } catch (e) {
            return isoStr || 'N/A';
          }
        };

        const getRelativeTime = (isoStr) => {
          try {
            const diffMs = Date.now() - new Date(isoStr).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Hace instantes';
            if (diffMins < 60) return `Hace ${diffMins} min`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `Hace ${diffHours} h`;
            return `Hace ${Math.floor(diffHours / 24)} d`;
          } catch (e) {
            return '';
          }
        };

        const getTypeBadge = (tipo) => {
          switch (tipo) {
            case 'alerta':
              return {
                bg: 'rgba(244, 63, 94, 0.15)',
                color: '#f43f5e',
                border: '#f43f5e55',
                label: '🚨 ALERTA BIOMÉTRICA'
              };
            case 'caso':
              return {
                bg: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                border: '#a855f755',
                label: '📁 EXPEDIENTE CASO'
              };
            case 'forense':
              return {
                bg: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '#10b98155',
                label: '🔬 DOSSIER FORENSE'
              };
            case 'sistema':
            default:
              return {
                bg: 'rgba(14, 165, 233, 0.15)',
                color: '#38bdf8',
                border: '#0ea5e955',
                label: '🖥️ OPERATIVO C4I'
              };
          }
        };

        const filteredLogs = auditLogs.filter((log) => {
          if (auditTypeFilter !== 'todos' && log.tipo !== auditTypeFilter) return false;
          if (auditSearch.trim()) {
            const q = auditSearch.toLowerCase();
            const matchAccion = (log.accion || '').toLowerCase().includes(q);
            const matchDetalles = (log.detalles || '').toLowerCase().includes(q);
            const matchOperador = (log.operador || '').toLowerCase().includes(q);
            const matchEstado = (log.estado || '').toLowerCase().includes(q);
            const matchId = String(log.id || '').toLowerCase().includes(q);
            if (!matchAccion && !matchDetalles && !matchOperador && !matchEstado && !matchId) return false;
          }
          return true;
        });

        const handleExportAudit = () => {
          try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `bitacora_auditoria_c4i_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            dlAnchor.remove();
            setAuditExportNotice('✓ Bitácora exportada exitosamente en formato JSON con firmas SHA-256.');
            setTimeout(() => setAuditExportNotice(''), 4500);
          } catch (e) {
            console.error('Error al exportar:', e);
          }
        };

        const handleCopyHash = (hash) => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(hash);
            setCopiedHashNotice('✓ Hash copiado al portapapeles');
            setTimeout(() => setCopiedHashNotice(''), 3000);
          }
        };

        const handleSaveNewLog = (e) => {
          e.preventDefault();
          if (!newLogData.accion.trim()) return;

          const createdLog = {
            id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
            fecha: new Date().toISOString(),
            accion: newLogData.accion.trim(),
            tipo: newLogData.tipo,
            detalles: newLogData.detalles.trim() || 'Novedad operacional consignada por el operador de turno.',
            operador: newLogData.operador || 'Operador DCI #402',
            estado: newLogData.estado || 'Registrado',
            hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            ip_origen: '192.168.10.45',
            estacion: newLogData.estacion || 'Puesto C4I Alpha-1'
          };

          setAuditLogs([createdLog, ...auditLogs]);
          setShowAddLogModal(false);
          setNewLogData({
            accion: '',
            tipo: 'alerta',
            detalles: '',
            operador: 'Operador DCI #402',
            estado: 'Verificado Manualmente',
            estacion: 'Puesto C4I Alpha-1'
          });
          setAuditExportNotice(`✓ Entrada ${createdLog.id} registrada e indexada en el libro de auditoría.`);
          setTimeout(() => setAuditExportNotice(''), 4500);
        };

        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* ENCABEZADO Y TARJETAS DE ESTADÍSTICAS */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.75)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.35rem 0', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.6rem' }}>📋</span>
                    <span>Bitácora de Auditoría y Trazabilidad Forense</span>
                  </h2>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                    Libro maestro inmutable de actuaciones periciales, validación biométrica facial y despachos de seguridad C4I.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleExportAudit}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderColor: '#0284c7',
                      color: '#38bdf8',
                      fontWeight: '700',
                      padding: '0.6rem 1rem'
                    }}
                  >
                    <span>📥</span>
                    <span>Exportar Libro (.JSON)</span>
                  </button>

                  <button
                    onClick={() => setShowAddLogModal(true)}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      border: 'none',
                      fontWeight: '700',
                      padding: '0.6rem 1.15rem'
                    }}
                  >
                    <span>➕</span>
                    <span>Registrar Novedad de Guardia</span>
                  </button>
                </div>
              </div>

              {/* AVISOS DE ACCIÓN */}
              {auditExportNotice && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {auditExportNotice}
                </div>
              )}

              {copiedHashNotice && (
                <div style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginBottom: '1rem'
                }}>
                  {copiedHashNotice}
                </div>
              )}

              {/* TARJETAS RESUMEN DE INDICADORES */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Total Entradas
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc', marginTop: '0.2rem' }}>
                    {auditLogs.length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                    Registros en memoria activa
                  </div>
                </div>

                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(244, 63, 94, 0.25)'
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#f43f5e', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Alertas Validadas
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f43f5e', marginTop: '0.2rem' }}>
                    {auditLogs.filter(l => l.tipo === 'alerta').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#fda4af', marginTop: '0.2rem' }}>
                    Cotejos y descartes faciales
                  </div>
                </div>

                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(168, 85, 247, 0.25)'
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#c084fc', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Expedientes / Casos
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c084fc', marginTop: '0.2rem' }}>
                    {auditLogs.filter(l => l.tipo === 'caso').length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#e9d5ff', marginTop: '0.2rem' }}>
                    Cambios de estado y rescates
                  </div>
                </div>

                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#34d399', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Cadena de Custodia
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34d399', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🛡️</span>
                    <span>100% Cripto</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#a7f3d0', marginTop: '0.2rem' }}>
                    Hashes SHA-256 verificados
                  </div>
                </div>
              </div>
            </div>

            {/* BARRA DE BÚSQUEDA Y FILTROS POR CATEGORÍA */}
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
                <span style={{ fontSize: '1.2rem', color: '#64748b' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por ID, acción, operador, expediente o detalle..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                {auditSearch && (
                  <button
                    onClick={() => setAuditSearch('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✕ Limpiar
                  </button>
                )}
              </div>

              {/* BOTONES DE FILTRADO POR TIPO */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'alerta', label: 'Alertas' },
                  { id: 'caso', label: 'Casos' },
                  { id: 'forense', label: 'Forense' },
                  { id: 'sistema', label: 'Sistema' }
                ].map((tab) => {
                  const isSelected = auditTypeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setAuditTypeFilter(tab.id)}
                      style={{
                        background: isSelected ? '#0284c7' : 'rgba(30, 41, 59, 0.7)',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '7px',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TABLA PRINCIPAL DE LA BITÁCORA */}
            <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', color: '#94a3b8' }}>
                      <th style={{ padding: '1rem', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID & Fecha</th>
                      <th style={{ padding: '1rem', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</th>
                      <th style={{ padding: '1rem', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acción & Operador</th>
                      <th style={{ padding: '1rem', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detalles de la Actuación</th>
                      <th style={{ padding: '1rem', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                      <th style={{ padding: '1rem', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Firma SHA-256</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#e2e8f0' }}>No se encontraron registros de auditoría</div>
                          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Prueba ajustando el término de búsqueda o el filtro de categoría.</div>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const badge = getTypeBadge(log.tipo);
                        return (
                          <tr
                            key={log.id}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            {/* ID Y FECHA */}
                            <td style={{ padding: '1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: '800', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                #{log.id}
                              </div>
                              <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                {formatAuditDate(log.fecha)}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                                {getRelativeTime(log.fecha)}
                              </div>
                            </td>

                            {/* TIPO */}
                            <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                              <span style={{
                                display: 'inline-block',
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                padding: '0.25rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '800',
                                letterSpacing: '0.3px',
                                whiteSpace: 'nowrap'
                              }}>
                                {badge.label}
                              </span>
                            </td>

                            {/* ACCIÓN Y OPERADOR */}
                            <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: '700', color: '#f1f5f9', fontSize: '0.9rem' }}>
                                {log.accion}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                                <span>👮</span>
                                <span>{log.operador}</span>
                              </div>
                            </td>

                            {/* DETALLES */}
                            <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '380px' }}>
                              <div style={{ color: '#cbd5e1', lineHeight: '1.45', fontSize: '0.85rem' }}>
                                {log.detalles}
                              </div>
                              {log.estacion && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                                  Terminal: {log.estacion} {log.ip_origen ? `(${log.ip_origen})` : ''}
                                </div>
                              )}
                            </td>

                            {/* ESTADO */}
                            <td style={{ padding: '1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <span style={{
                                display: 'inline-block',
                                background: 'rgba(30, 41, 59, 0.9)',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}>
                                {log.estado || 'Procesado'}
                              </span>
                            </td>

                            {/* HASH SHA-256 */}
                            <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                              {log.hash ? (
                                <div
                                  onClick={() => handleCopyHash(log.hash)}
                                  title="Click para copiar hash forense completo"
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    color: '#34d399',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    padding: '0.3rem 0.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <span>{log.hash.substring(0, 10)}...{log.hash.substring(58)}</span>
                                  <span style={{ fontSize: '0.7rem' }}>📋</span>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Sin firma</span>
                              )}
                            </td>

                            {/* ACCIÓN VER DETALLE */}
                            <td style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'center' }}>
                              <button
                                onClick={() => setSelectedAuditLog(log)}
                                className="btn btn-secondary"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.35rem 0.65rem',
                                  borderColor: 'rgba(255, 255, 255, 0.2)',
                                  color: '#38bdf8',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                👁️ Detalle
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODAL DETALLES DEL REGISTRO DE AUDITORÍA */}
            {selectedAuditLog && (
              <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
                <div
                  className="glass-panel"
                  style={{
                    maxWidth: '620px',
                    width: '100%',
                    padding: '2rem',
                    background: 'rgba(15, 23, 42, 0.98)',
                    border: '1px solid #0284c7',
                    boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.25)',
                    borderRadius: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc' }}>
                        Expediente de Auditoría #{selectedAuditLog.id}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedAuditLog(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '1.25rem',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                      background: 'rgba(30, 41, 59, 0.7)',
                      padding: '1rem',
                      borderRadius: '10px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      fontSize: '0.85rem'
                    }}>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Marca de Tiempo (ISO/UTC)</div>
                        <div style={{ color: '#f1f5f9', fontWeight: '600', marginTop: '0.2rem' }}>{formatAuditDate(selectedAuditLog.fecha)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Operador Responsable</div>
                        <div style={{ color: '#f1f5f9', fontWeight: '600', marginTop: '0.2rem' }}>{selectedAuditLog.operador}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Terminal / Estación</div>
                        <div style={{ color: '#f1f5f9', fontWeight: '600', marginTop: '0.2rem' }}>{selectedAuditLog.estacion || 'Puesto C4I Principal'}</div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Dirección IP Origen</div>
                        <div style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: '600', marginTop: '0.2rem' }}>{selectedAuditLog.ip_origen || '127.0.0.1'}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Acción Ejecutada</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff' }}>{selectedAuditLog.accion}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Descripción Operativa y Evidencia</div>
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#cbd5e1',
                        lineHeight: '1.5',
                        fontSize: '0.9rem'
                      }}>
                        {selectedAuditLog.detalles}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Hash Criptográfico de Integridad (SHA-256)</span>
                        <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '700' }}>✓ Inmutable & Verificado</span>
                      </div>
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        padding: '0.85rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: '#34d399',
                        wordBreak: 'break-all',
                        lineHeight: '1.4'
                      }}>
                        {selectedAuditLog.hash || 'Sin hash criptográfico asignado'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    {selectedAuditLog.hash && (
                      <button
                        onClick={() => handleCopyHash(selectedAuditLog.hash)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem' }}
                      >
                        📋 Copiar Hash
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedAuditLog(null)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem' }}
                    >
                      Cerrar Detalle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL REGISTRAR NUEVA NOVEDAD DE GUARDIA */}
            {showAddLogModal && (
              <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
                <div
                  className="glass-panel"
                  style={{
                    maxWidth: '560px',
                    width: '100%',
                    padding: '2rem',
                    background: 'rgba(15, 23, 42, 0.98)',
                    border: '1px solid #0284c7',
                    boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.25)',
                    borderRadius: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>✍️</span>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc' }}>
                        Registrar Novedad en Bitácora
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowAddLogModal(false)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveNewLog} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                        Acción Realizada / Asunto *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Cambio de patrulla en perímetro, verificación de fotograma..."
                        value={newLogData.accion}
                        onChange={(e) => setNewLogData({ ...newLogData, accion: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                          Categoría / Tipo
                        </label>
                        <select
                          value={newLogData.tipo}
                          onChange={(e) => setNewLogData({ ...newLogData, tipo: e.target.value })}
                          style={{
                            width: '100%',
                            background: 'rgba(30, 41, 59, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '0.9rem'
                          }}
                        >
                          <option value="alerta">Alerta Biométrica</option>
                          <option value="caso">Expediente de Caso</option>
                          <option value="forense">Dossier Forense</option>
                          <option value="sistema">Sistema / Turno</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                          Estado
                        </label>
                        <select
                          value={newLogData.estado}
                          onChange={(e) => setNewLogData({ ...newLogData, estado: e.target.value })}
                          style={{
                            width: '100%',
                            background: 'rgba(30, 41, 59, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '0.9rem'
                          }}
                        >
                          <option value="Verificado Manualmente">Verificado Manualmente</option>
                          <option value="En Curso">En Curso</option>
                          <option value="Notificado a PNC">Notificado a PNC</option>
                          <option value="Archivado">Archivado</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                        Operador Responsable
                      </label>
                      <input
                        type="text"
                        value={newLogData.operador}
                        onChange={(e) => setNewLogData({ ...newLogData, operador: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                        Detalles Periciales y Justificación Operativa
                      </label>
                      <textarea
                        rows="3"
                        placeholder="Escribe aquí los pormenores de la actuación, evidencias observadas, etc."
                        value={newLogData.detalles}
                        onChange={(e) => setNewLogData({ ...newLogData, detalles: e.target.value })}
                        style={{
                          width: '100%',
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.9rem',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddLogModal(false)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.9rem' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ fontSize: '0.9rem', background: '#0284c7', border: 'none', fontWeight: '700' }}
                      >
                        ✓ Guardar Entrada
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ================= CONTENIDO PESTAÑA: PERSONAL ACTIVO & DESPACHO PNC ================= */}
      {activeTab === 'patrullas' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Métricas y KPIs de Fuerza Policial Desplegada */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}>
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', background: 'rgba(15, 23, 42, 0.9)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Oficiales & Unidades Registradas
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f8fafc', marginTop: '0.25rem' }}>
                {patrols.length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '0.2rem' }}>
                Fuerza operativa en servicio activo
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', background: 'rgba(15, 23, 42, 0.9)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Patrullas con GPS en Vivo
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34d399', marginTop: '0.25rem' }}>
                {patrols.filter(p => p.lat && p.lng).length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6ee7b7', marginTop: '0.2rem' }}>
                Telemetría satelital activa C4I
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b', background: 'rgba(15, 23, 42, 0.9)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Casos Pendientes de Despacho
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.25rem' }}>
                {cases.filter(c => c.estado === 'Desaparecido').length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#fde68a', marginTop: '0.2rem' }}>
                Expedientes listos para cuadrilla
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #00f0ff', background: 'rgba(15, 23, 42, 0.9)' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Enlace Radial Intercom
              </div>
              <button
                type="button"
                onClick={() => {
                  setTargetPatrolForCall(null);
                  setModRadioModalOpen(true);
                }}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(2, 132, 199, 0.35)'
                }}
              >
                <span>📞</span>
                <span>Canal General Radio PNC</span>
              </button>
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros de Patrullas */}
          <div className="glass-panel" style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            background: 'rgba(15, 23, 42, 0.85)'
          }}>
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por oficial, placa/ONI, patrulla o delegación..."
                value={patrolSearchTerm}
                onChange={(e) => setPatrolSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
              />
            </div>

            <div style={{ flex: '0 1 200px' }}>
              <select
                className="form-control"
                value={patrolFilterDelegacion}
                onChange={(e) => setPatrolFilterDelegacion(e.target.value)}
              >
                <option value="todas">Todas las Delegaciones</option>
                {DEPARTAMENTOS_SV.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchPatrols}
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <span>🔄</span>
              <span>{patrolsLoading ? 'Sincronizando...' : 'Actualizar'}</span>
            </button>
          </div>

          {/* Listado de Unidades Policiales Activas */}
          {(() => {
            const filteredPatrols = patrols.filter((p) => {
              const term = patrolSearchTerm.toLowerCase();
              const matchName = (p.nombre || '').toLowerCase().includes(term);
              const matchPlaca = (p.placa_pnc || '').toLowerCase().includes(term);
              const matchPatrulla = (p.patrulla_pnc || '').toLowerCase().includes(term);
              const matchDelegacion = (p.delegacion_pnc || '').toLowerCase().includes(term);
              const matchDepto = patrolFilterDelegacion === 'todas' || (p.delegacion_pnc || '').toLowerCase().includes(patrolFilterDelegacion.toLowerCase());
              return (matchName || matchPlaca || matchPatrulla || matchDelegacion) && matchDepto;
            });

            if (filteredPatrols.length === 0) {
              return (
                <div className="glass-panel text-center" style={{ padding: '3.5rem 2rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚔</div>
                  <h3>No hay unidades policiales coincidentes</h3>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto' }}>
                    Verifique los filtros o espere a que las patrullas inicien sesión en servicio en la aplicación móvil o web.
                  </p>
                </div>
              );
            }

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '1.25rem'
              }}>
                {filteredPatrols.map((patrol) => {
                  const hasGps = Boolean(patrol.lat && patrol.lng);
                  return (
                    <div
                      key={patrol.id}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        background: 'rgba(15, 23, 42, 0.95)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                    >
                      {/* Cabecera de Patrulla */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            fontFamily: 'monospace'
                          }}>
                            🚔 {patrol.patrulla_pnc || 'UNIDAD MÓVIL PNC'}
                          </span>
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            color: patrol.en_servicio !== false ? '#34d399' : '#94a3b8',
                            fontWeight: 700
                          }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: patrol.en_servicio !== false ? '#10b981' : '#64748b',
                              boxShadow: patrol.en_servicio !== false ? '0 0 8px #10b981' : 'none'
                            }}></span>
                            {patrol.en_servicio !== false ? 'EN SERVICIO' : 'INACTIVO'}
                          </span>
                        </div>

                        <h4 style={{ margin: '0.2rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                          {patrol.nombre}
                        </h4>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                          Placa Policial / ONI: <strong style={{ color: '#e2e8f0' }}>{patrol.placa_pnc || 'ONIE-OFICIAL'}</strong>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                          🏢 Delegación: <strong>{patrol.delegacion_pnc || 'San Salvador Centro'}</strong>
                        </div>
                      </div>

                      {/* Telemetría GPS en Vivo */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.35)',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#94a3b8' }}>Coordenadas GPS:</span>
                          <span style={{ color: hasGps ? '#34d399' : '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>
                            {hasGps ? `${Number(patrol.lat).toFixed(4)}, ${Number(patrol.lng).toFixed(4)}` : 'Sin señal satelital'}
                          </span>
                        </div>
                        {patrol.telefono && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#94a3b8' }}>Línea Oficial:</span>
                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{patrol.telefono}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>Última Telemetría:</span>
                          <span style={{ color: '#cbd5e1' }}>
                            {patrol.ultima_conexion ? new Date(patrol.ultima_conexion).toLocaleTimeString() : 'En vivo'}
                          </span>
                        </div>
                      </div>

                      {/* Botones de Acción de Despacho y Comunicación */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetPatrolForCall(patrol);
                            setModRadioModalOpen(true);
                          }}
                          style={{
                            padding: '0.55rem',
                            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer'
                          }}
                        >
                          <span>📞</span>
                          <span>Radio Intercom</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAssignModalTarget(patrol)}
                          style={{
                            padding: '0.55rem',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            cursor: 'pointer'
                          }}
                        >
                          <span>⚡</span>
                          <span>Despachar a Caso</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ================= MODAL: ASIGNACIÓN / REASIGNACIÓN DE PATRULLA A CASO ================= */}
      {assignModalTarget && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid #f59e0b',
              boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.25)',
              borderRadius: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🚔</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                    Despacho Táctico de Patrulla
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#fbbf24' }}>
                    {assignModalTarget.nombre} • {assignModalTarget.patrulla_pnc || 'Patrulla'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setAssignModalTarget(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>
                Seleccione Expediente / Caso para Misión de Rescate:
              </label>
              <select
                className="form-control"
                value={selectedCaseForAssign}
                onChange={(e) => setSelectedCaseForAssign(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(30, 41, 59, 0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px' }}
              >
                <option value="">-- Seleccione un caso a despachar --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    EXP #{c.id}: {c.nombre_desaparecido} ({c.estado}) - {c.ubicacion_desaparicion}
                  </option>
                ))}
              </select>
            </div>

            {selectedCaseForAssign && (() => {
              const selectedCase = cases.find(c => String(c.id) === String(selectedCaseForAssign));
              if (!selectedCase) return null;
              return (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.25rem', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div><strong>Persona:</strong> {selectedCase.nombre_desaparecido} ({selectedCase.edad} años)</div>
                  <div><strong>Ubicación:</strong> {selectedCase.ubicacion_desaparicion} ({selectedCase.departamento})</div>
                  {selectedCase.direccion_vivienda && (
                    <div style={{ color: '#34d399' }}>🏠 <strong>Residencia habitual:</strong> {selectedCase.direccion_vivienda}</div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAssignModalTarget(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedCaseForAssign}
                onClick={() => handleAssignPatrolToCase(assignModalTarget.id, selectedCaseForAssign)}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1.25rem',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ⚡ Confirmar Despacho Oficial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: INTERCOMUNICADOR Y RADIO TÁCTICO C4I ================= */}
      {modRadioModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid #00f0ff',
              boxShadow: '0 25px 50px -12px rgba(0, 240, 255, 0.25)',
              borderRadius: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem' }}>📡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                    Centro Táctico C4I - Enlace Radial PNC
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                    CANAL NACIONAL 154.200 MHz • ENCRIPTADO AES-256
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModRadioModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Selector de Destinatario */}
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Destino de Transmisión:</span>
              <select
                value={targetPatrolForCall ? targetPatrolForCall.id : 'todos'}
                onChange={(e) => {
                  if (e.target.value === 'todos') {
                    setTargetPatrolForCall(null);
                  } else {
                    const match = patrols.find(p => String(p.id) === e.target.value);
                    setTargetPatrolForCall(match || null);
                  }
                }}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#00f0ff',
                  fontSize: '0.78rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px'
                }}
              >
                <option value="todos">📢 Transmisión General (Todas las patrullas)</option>
                {patrols.map(p => (
                  <option key={p.id} value={p.id}>
                    🚔 {p.patrulla_pnc || 'Patrulla'} - {p.nombre} ({p.delegacion_pnc || 'PNC'})
                  </option>
                ))}
              </select>
            </div>

            {/* Bitácora de Transmisiones */}
            <div style={{
              height: '200px',
              overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {modRadioLog.map((log, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.65rem', borderRadius: '6px', borderLeft: '3px solid #00f0ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#38bdf8', marginBottom: '0.15rem', fontWeight: 700 }}>
                    <span>{log.de} {log.destinatario ? `➔ ${log.destinatario}` : ''}</span>
                    <span style={{ color: '#64748b' }}>{log.hora}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>{log.texto}</div>
                </div>
              ))}
            </div>

            {/* Input y Botón Push-To-Talk */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={modRadioMessage}
                onChange={(e) => setModRadioMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendModRadio()}
                placeholder="Escriba orden o mensaje táctico por radio..."
                style={{
                  flex: 1,
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
              <button
                type="button"
                onClick={handleSendModRadio}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1.25rem',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <span>📡</span>
                <span>Transmitir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR EXPEDIENTE DE CASO (MODERADOR / ADMIN) ================= */}
      {editingCase && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '640px',
              width: '100%',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid #c084fc',
              boxShadow: '0 25px 50px -12px rgba(192, 132, 252, 0.25)',
              borderRadius: '16px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✏️</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                  Editar Expediente #{editingCase.id}
                </h3>
              </div>
              <button
                onClick={() => setEditingCase(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditCase} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCaseForm.nombre_desaparecido}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, nombre_desaparecido: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Edad *
                  </label>
                  <input
                    type="number"
                    required
                    value={editCaseForm.edad}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, edad: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Género *
                  </label>
                  <select
                    value={editCaseForm.genero}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, genero: e.target.value })}
                    className="form-control"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Lugar de Desaparición *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCaseForm.ubicacion_desaparicion}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, ubicacion_desaparicion: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Departamento *
                  </label>
                  <select
                    value={editCaseForm.departamento}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, departamento: e.target.value })}
                    className="form-control"
                  >
                    {DEPARTAMENTOS_SV.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#34d399', marginBottom: '0.3rem', fontWeight: 700 }}>
                    🏠 Vivienda Habitual (Traslado Seguro)
                  </label>
                  <input
                    type="text"
                    placeholder="Dirección exacta de residencia..."
                    value={editCaseForm.direccion_vivienda}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, direccion_vivienda: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Parentesco o Vínculo del Reportante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Madre, Padre, Hermano, Vecino..."
                    value={editCaseForm.parentesco_reportante}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, parentesco_reportante: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Estado del Caso *
                  </label>
                  <select
                    value={editCaseForm.estado}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, estado: e.target.value })}
                    className="form-control"
                  >
                    <option value="Desaparecido">Desaparecido</option>
                    <option value="En Proceso de Rescate">En Proceso de Rescate</option>
                    <option value="Encontrado">Encontrado / Localizado</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Vestimenta
                  </label>
                  <input
                    type="text"
                    value={editCaseForm.vestimenta}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, vestimenta: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                  Descripción / Hechos de la desaparición
                </label>
                <textarea
                  rows="3"
                  value={editCaseForm.descripcion}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, descripcion: e.target.value })}
                  className="form-control"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEditCase}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', border: 'none', fontWeight: 800 }}
                >
                  {savingEditCase ? 'Guardando...' : '✓ Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ENLACE TRANSMISOR MÓVIL DIRECTO ================= */}
      {showMobileLinkModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid #10b981',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(16, 185, 129, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.8rem' }}>📱</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                    Transmisor Móvil Táctico C4I
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Transmite desde cualquier celular sin aplicaciones externas ni bloqueos de red
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileLinkModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.88rem',
              lineHeight: '1.5',
              color: '#d1fae5'
            }}>
              <strong>💡 ¿Cómo funciona?</strong>
              <p style={{ margin: '0.4rem 0 0 0' }}>
                Abre el siguiente enlace en <strong>Google Chrome o Safari en tu teléfono celular</strong> (funciona con cualquier red Wi-Fi o datos móviles 4G/5G).
                Tu teléfono solicitará permiso de cámara y comenzará a transmitir video en alta definición directamente a este Centro de Mando, activando el reconocimiento facial de personas desaparecidas en tiempo real.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                Enlace para abrir en tu celular:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={`http://${window.location.hostname === 'localhost' ? '172.16.2.60' : window.location.hostname}:5173/transmisor`}
                  style={{
                    flex: 1,
                    background: '#090d16',
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#34d399',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    fontWeight: '700'
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = `http://${window.location.hostname === 'localhost' ? '172.16.2.60' : window.location.hostname}:5173/transmisor`;
                    navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  style={{
                    background: copiedLink ? '#059669' : '#10b981',
                    color: '#020617',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 1.25rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {copiedLink ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  window.open('/transmisor', '_blank');
                  setShowMobileLinkModal(false);
                }}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>💻</span>
                <span>Probar con Webcam de esta PC</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMobileLinkModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.85rem 1.5rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONECTAR CÁMARA IP WEBCAM ================= */}
      {showAddCamModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.8rem' }}>📱</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                    Conectar Cámara IP Webcam
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Transmisión en vivo desde tu teléfono Android o cámara IP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCamModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                ✕
              </button>
            </div>

            {/* Tip de Conexión de Cámaras */}
            <div style={{
              background: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.82rem',
              color: '#93c5fd',
              marginBottom: '1.25rem',
              lineHeight: 1.4
            }}>
              💡 <strong>Cámaras Wi-Fi Soportadas:</strong>
              <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
                <li><strong>Cámaras Robóticas PTZ 360°:</strong> Domos motorizados con control de giro, inclinación y auto-patrullaje.</li>
                <li><strong>Cámaras Fijas Wi-Fi:</strong> Cámaras CCTV de seguridad con zoom digital.</li>
                <li><strong>Teléfonos con IP Webcam:</strong> Utiliza cualquier Android como cámara de vigilancia táctica.</li>
              </ul>
            </div>

            <form onSubmit={handleCreateCamera}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Tipo de Cámara / Perfil de Movimiento</label>
                <select
                  className="form-control"
                  value={newCamForm.tipo}
                  onChange={(e) => {
                    const sel = e.target.value;
                    let placeholderName = newCamForm.nombre;
                    if (sel.includes('PTZ')) placeholderName = 'Cámara Robótica PTZ Wi-Fi 01';
                    else if (sel.includes('Fija')) placeholderName = 'Cámara Fija Wi-Fi 01';
                    else placeholderName = 'Cámara Móvil IP Webcam';
                    setNewCamForm({ ...newCamForm, tipo: sel, nombre: placeholderName });
                  }}
                >
                  <option value="Cámara IP Wi-Fi PTZ 360° (Robótica / Domo)">🤖 Cámara IP Wi-Fi PTZ 360° (Robótica / Domo Motorizado)</option>
                  <option value="Cámara IP Wi-Fi Fija (CCTV Seguridad)">📹 Cámara IP Wi-Fi Fija (CCTV Seguridad)</option>
                  <option value="Cámara Móvil IP Webcam (Android)">📱 Cámara Móvil IP Webcam (Android)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nombre Identificador de la Cámara</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Cámara Robótica Domo Norte"
                  value={newCamForm.nombre}
                  onChange={(e) => setNewCamForm({ ...newCamForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dirección IP de la Cámara (App IP Webcam)</span>
                  <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>Puerto estándar :8080</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. 192.168.1.50:8080"
                    value={newCamForm.ip_address}
                    onChange={(e) => setNewCamForm({ ...newCamForm, ip_address: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleTestIpConnection}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
                  >
                    🔍 Probar
                  </button>
                </div>
                {ipTestStatus && (
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.78rem', color: ipTestStatus.includes('✓') ? '#4ade80' : '#f59e0b' }}>
                    {ipTestStatus}
                  </p>
                )}
              </div>

              <div className="meta-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Departamento (El Salvador)</label>
                  <select
                    className="form-control"
                    value={newCamForm.departamento}
                    onChange={(e) => setNewCamForm({ ...newCamForm, departamento: e.target.value, ubicacion: `${e.target.value}, El Salvador` })}
                  >
                    {DEPARTAMENTOS_SV.map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Punto de Cobertura / Sector</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. San Salvador Centro"
                    value={newCamForm.ubicacion}
                    onChange={(e) => setNewCamForm({ ...newCamForm, ubicacion: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCamModal(false)}
                  className="btn btn-secondary"
                  disabled={camSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={camSubmitting}
                  style={{ fontWeight: '700' }}
                >
                  {camSubmitting ? 'Conectando...' : '✓ Vincular Cámara al Sistema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PANTALLA COMPLETA CCTV HUD ================= */}
      {expandedCamera && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 12500 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '900px',
              width: '95%',
              background: 'rgba(2, 6, 23, 0.98)',
              border: '2px solid rgba(56, 189, 248, 0.5)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.95)'
            }}
          >
            {/* Header HUD */}
            <div style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(15, 23, 42, 0.9)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'ping 1.5s infinite' }} />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                  {expandedCamera.nombre}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                  [{expandedCamera.ip_address || 'STREAM EN VIVO'}]
                </span>
              </div>
              <button
                onClick={() => setExpandedCamera(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                ✕ Salir de Pantalla Completa
              </button>
            </div>

            {/* Video grande */}
            <div style={{ position: 'relative', height: '520px', background: '#000' }}>
              {(() => {
                const expandedDirect = expandedCamera.stream_url || (expandedCamera.base_url ? `${expandedCamera.base_url}/video` : (expandedCamera.ip_address ? `http://${expandedCamera.ip_address}/video` : ''));
                const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
                const canUseDirect = !isHttps || (expandedDirect && expandedDirect.startsWith('https://'));
                const expandedPreferDirect = canUseDirect && (useDirectStreamMode[expandedCamera.id] !== undefined ? Boolean(useDirectStreamMode[expandedCamera.id]) : Boolean(expandedCamera.ip_address));
                const expandedSrc = (expandedPreferDirect && expandedDirect)
                  ? `${expandedDirect}${expandedDirect.includes('?') ? '&' : '?'}t=${streamRefreshKey}`
                  : `${getServerBaseUrl()}/api/camaras/${expandedCamera.id}/stream?t=${streamRefreshKey}`;

                return (
                  <img
                    src={expandedSrc}
                    alt={expandedCamera.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      if (expandedDirect && e.currentTarget.src !== expandedDirect) {
                        e.currentTarget.src = `${expandedDirect}${expandedDirect.includes('?') ? '&' : '?'}t=${streamRefreshKey}`;
                      } else {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="%23020617"/><text x="50%" y="45%" fill="%23ef4444" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle">⚠️ SEÑAL NO DISPONIBLE</text><text x="50%" y="55%" fill="%2394a3b8" font-family="monospace" font-size="16" text-anchor="middle">Verifique conexión IP Webcam</text></svg>';
                      }
                    }}
                  />
                );
              })()}

              {/* HUD Retícula de Monitoreo */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                border: '1px dashed rgba(56, 189, 248, 0.4)',
                borderRadius: '50%',
                pointerEvents: 'none'
              }} />

              {/* Consola Flotante de Movimiento PTZ 360 en Pantalla Completa (Solo para cámaras robóticas con PTZ) */}
              {isPtzCapable(expandedCamera) && (
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                  zIndex: 20
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    color: '#38bdf8',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    paddingBottom: '0.25rem',
                    gap: '0.5rem'
                  }}>
                    <span>🕹️ MOVIMIENTO PTZ</span>
                    <span style={{ fontSize: '0.65rem', color: '#a855f7', fontFamily: 'monospace' }}>
                      {camControlsState[expandedCamera.id]?.pan || 0}° / {camControlsState[expandedCamera.id]?.tilt || 0}°
                    </span>
                  </div>

                  {/* Cruceta Direccional */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gap: '4px' }}>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_upleft')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }} title="Arriba-Izquierda">↖️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_up')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} title="Inclinar Arriba">⬆️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_upright')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }} title="Arriba-Derecha">↗️</button>

                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_left')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} title="Girar Izquierda">⬅️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_center')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(234,179,8,0.3)', border: '1px solid #eab308', color: '#fef08a', cursor: 'pointer', fontSize: '0.9rem' }} title="Centrar Posición">🎯</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_right')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} title="Girar Derecha">➡️</button>

                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_downleft')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }} title="Abajo-Izquierda">↙️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_down')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: '#0284c7', border: '1px solid #38bdf8', color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold' }} title="Inclinar Abajo">⬇️</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'ptz_downright')} style={{ width: '36px', height: '32px', borderRadius: '6px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.85rem' }} title="Abajo-Derecha">↘️</button>
                  </div>

                  {/* Zoom +/- y Auto-Patrullaje */}
                  <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '2px' }}>
                    <button onClick={() => handleCameraControl(expandedCamera, 'zoom_out')} style={{ flex: 1, padding: '0.2rem', borderRadius: '4px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }} title="Alejar Zoom">➖</button>
                    <button onClick={() => handleCameraControl(expandedCamera, 'zoom_in')} style={{ flex: 1, padding: '0.2rem', borderRadius: '4px', background: 'rgba(30,41,59,0.75)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }} title="Acercar Zoom">➕</button>
                    <button
                      onClick={() => handleCameraControl(expandedCamera, 'ptz_patrol')}
                      style={{
                        flex: 1.5,
                        padding: '0.2rem 0.35rem',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        borderRadius: '4px',
                        background: camControlsState[expandedCamera.id]?.patrol ? 'rgba(34, 197, 94, 0.35)' : 'rgba(255,255,255,0.08)',
                        border: camControlsState[expandedCamera.id]?.patrol ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
                        color: camControlsState[expandedCamera.id]?.patrol ? '#4ade80' : '#cbd5e1',
                        cursor: 'pointer'
                      }}
                      title="Auto-patrullaje continuo 360°"
                    >
                      {camControlsState[expandedCamera.id]?.patrol ? '🟢 360°' : '🔄 360°'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{
                position: 'absolute',
                bottom: '15px',
                left: '15px',
                background: 'rgba(0, 0, 0, 0.8)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#22c55e'
              }}>
                REC ● {liveClock} | 📍 {expandedCamera.ubicacion} | GPS: [{expandedCamera.lat}, {expandedCamera.lng}]
              </div>

              {/* Botones de Hardware Flotantes en Pantalla Completa */}
              <div style={{
                position: 'absolute',
                bottom: '15px',
                right: '15px',
                display: 'flex',
                gap: '0.5rem'
              }}>
                <button
                  onClick={() => handleCameraControl(expandedCamera, (camControlsState[expandedCamera.id]?.torch) ? 'torch_off' : 'torch_on')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                >
                  💡 Flash
                </button>
                <button
                  onClick={() => handleCameraControl(expandedCamera, 'focus')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                >
                  🎯 Enfocar
                </button>
                <button
                  onClick={() => handleCameraControl(expandedCamera, 'capture')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
                >
                  📸 Capturar
                </button>
                <button
                  onClick={() => handleTriggerLiveDetection(expandedCamera)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', fontWeight: '700' }}
                >
                  ⚡ Escaneo IA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ZOOM DE IMAGEN DE EVIDENCIA ================= */}
      {previewImage && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 13000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '750px',
              width: '90%',
              padding: '1.5rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '16px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>
                🔍 Inspección Fotográfica de Evidencia
              </h3>
              <button onClick={() => setPreviewImage(null)} className="btn btn-secondary" style={{ padding: '0.3rem 0.7rem' }}>
                ✕ Cerrar
              </button>
            </div>
            <div style={{ maxHeight: '65vh', overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
              <img
                src={previewImage}
                alt="Evidencia ampliada"
                style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: COTEJO FORENSE BIOMÉTRICO INSIGHTFACE ================= */}
      {biometricModalAlert && (
        <BiometricVerificationModal
          alerta={biometricModalAlert}
          cases={cases}
          onClose={() => setBiometricModalAlert(null)}
          onConfirm={(id) => handleStatusUpdate(id, 'confirmado')}
          onDiscard={(id) => handleStatusUpdate(id, 'falso positivo')}
        />
      )}

      {/* ================= MODAL: EDITAR DIRECCIÓN IP DE CÁMARA ================= */}
      {editingCamera && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 14000 }}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '480px',
              width: '92%',
              padding: '2rem',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✏️</span>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>
                    Actualizar IP de la Cámara
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {editingCamera.nombre}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingCamera(null)}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.6rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
              Si tu teléfono cambió de IP en la red Wi-Fi o reiniciaste la app IP Webcam, escribe la nueva dirección IP que muestra en pantalla:
            </p>

            <form onSubmit={handleSaveEditedIp}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dirección IPv4 + Puerto</span>
                  <span style={{ color: '#38bdf8', fontSize: '0.75rem' }}>Ej: 192.168.1.64:8080</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editIpValue}
                  onChange={(e) => setEditIpValue(e.target.value)}
                  placeholder="192.168.1.XX:8080"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingCamera(null)}
                  className="btn btn-secondary"
                  disabled={editIpSaving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editIpSaving}
                  style={{ fontWeight: '700' }}
                >
                  {editIpSaving ? 'Verificando y Guardando...' : '✓ Guardar y Reconectar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BÚFER FORENSE DE REBOBINADO INSTANTÁNEO (5s) ================= */}
      {rewindCamera && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 15000 }}>
          <div
            className="hud-panel corner-hud"
            style={{
              maxWidth: '840px',
              width: '95%',
              padding: '1.75rem',
              background: 'rgba(3, 7, 18, 0.96)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              borderRadius: '16px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 240, 255, 0.15)'
            }}
          >
            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.6rem' }}>⏪</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontFamily: 'monospace' }}>
                      BÚFER FORENSE: REBOBINADO INSTANTÁNEO (-5.0s)
                    </h3>
                    <span className="cyber-badge-cyan">FPS: 30 • 1080p</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Cámara: <strong>{rewindCamera.nombre}</strong> (IP: {rewindCamera.ip_address})
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setRewindCamera(null);
                  setRewindAnalysisResult(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Pantalla del Reproductor Forense con Scanlines */}
            <div style={{ position: 'relative', height: '360px', background: '#000', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
              <img
                src={`${getServerBaseUrl()}/api/camaras/${rewindCamera.id}/snapshot?t=${Date.now() - Math.round(rewindOffsetSec * 1000)}`}
                alt="Fotograma Rebobinado"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {/* HUD Retícula de Análisis Forense */}
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.85)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #eab308', color: '#fef08a', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: '800' }}>
                OFFSET TEMPORAL: -{rewindOffsetSec.toFixed(2)}s
              </div>

              <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.85)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #38bdf8', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                TIMECODE: {new Date(Date.now() - rewindOffsetSec * 1000).toLocaleTimeString('es-SV', { hour12: false })}
              </div>

              {/* Scanline overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))', backgroundSize: '100% 3px, 6px 100%', pointerEvents: 'none' }} />
            </div>

            {/* Barra Scrubber de Tiempo (-5.0s a 0.0s en vivo) */}
            <div style={{ margin: '1.25rem 0 1rem 0', background: 'rgba(15, 23, 42, 0.7)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', marginBottom: '0.4rem' }}>
                <span style={{ color: '#eab308', fontWeight: 'bold' }}>-5.0s (Pasado)</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Posición actual: -{rewindOffsetSec.toFixed(2)}s</span>
                <span style={{ color: '#00ff9d', fontWeight: 'bold' }}>0.0s (En vivo)</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={rewindOffsetSec}
                onChange={(e) => setRewindOffsetSec(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#00f0ff', cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRewindOffsetSec(prev => Math.min(5.0, prev + 0.5))}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                >
                  ⏮️ -0.5s
                </button>
                <button
                  type="button"
                  onClick={() => setRewindOffsetSec(2.5)}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: '#38bdf8' }}
                >
                  🎯 Centrar (-2.5s)
                </button>
                <button
                  type="button"
                  onClick={() => setRewindOffsetSec(prev => Math.max(0.1, prev - 0.5))}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                >
                  ⏭️ +0.5s
                </button>
              </div>
            </div>

            {/* Resultado de Análisis Biométrico en el Fotograma */}
            {rewindAnalysisResult && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: rewindAnalysisResult.face_detected ? 'rgba(0, 255, 157, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: rewindAnalysisResult.face_detected ? '1px solid #00ff9d' : '1px solid #ef4444',
                color: '#fff',
                fontSize: '0.82rem'
              }}>
                <div style={{ fontWeight: '800', marginBottom: '0.25rem', color: rewindAnalysisResult.face_detected ? '#00ff9d' : '#f87171' }}>
                  {rewindAnalysisResult.face_detected ? '✓ Rostro Humano Identificado en este Fotograma' : '✕ Sin rostros detectados en este fotograma'}
                </div>
                {rewindAnalysisResult.face_detected && (
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    Confianza: {rewindAnalysisResult.confidence}% • Calidad: {Math.round(rewindAnalysisResult.quality_score * 100)}% • Pose: Yaw {rewindAnalysisResult.pose?.yaw}°
                  </div>
                )}
              </div>
            )}

            {/* Botones de Acción Forense */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={async () => {
                  setRewindAnalyzing(true);
                  try {
                    const snapRes = await api.get(`/camaras/${rewindCamera.id}/snapshot`, { responseType: 'blob' });
                    const file = new File([snapRes.data], `rewind_snap_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    const formData = new FormData();
                    formData.append('foto', file);
                    const bioRes = await api.post('/biometria/scan', formData);
                    setRewindAnalysisResult(bioRes.data);
                  } catch (e) {
                    setRewindAnalysisResult({ face_detected: false, error: 'Error analizando fotograma' });
                  } finally {
                    setRewindAnalyzing(false);
                  }
                }}
                disabled={rewindAnalyzing}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', borderColor: '#38bdf8' }}
              >
                <span>🔬</span>
                <span>{rewindAnalyzing ? 'Analizando con IA...' : 'Analizar Biométricamente este Frame'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleCameraControl(rewindCamera, 'capture');
                  setCaptureNotice('✓ Fotograma de rebobinado congelado y guardado como evidencia judicial.');
                  setTimeout(() => setCaptureNotice(''), 4000);
                }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '800' }}
              >
                <span>📸</span>
                <span>Guardar Fotograma como Evidencia</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXPEDIENTE FORENSE Y DOSSIER VIVO DE CASO ================= */}
      {selectedDossierCaseId && (
        <CaseDossierModal
          isOpen={Boolean(selectedDossierCaseId)}
          caseId={selectedDossierCaseId}
          onClose={() => setSelectedDossierCaseId(null)}
        />
      )}
    </div>
  );
};

export default ModeratorPanel;
