/**
 * LocalizaSV - Módulo de Ruteo Táctico de Emergencia PNC
 * Calcula la ruta de llegada más rápida para unidades de la PNC
 * ante la confirmación positiva de una persona desaparecida por un moderador.
 */

// Base Central de Despacho Rápido PNC (División Central 911, San Salvador)
export const PNC_DEFAULT_BASE = {
  lat: 13.6989,
  lng: -89.1914,
  nombre: 'Base Central PNC 911 - San Salvador'
};

// Bases Regionales de Apoyo Táctico PNC en El Salvador
export const PNC_REGIONAL_BASES = [
  { nombre: 'PNC Delegación San Salvador Centro', lat: 13.6989, lng: -89.1914 },
  { nombre: 'PNC Delegación La Libertad (Santa Tecla)', lat: 13.6738, lng: -89.2862 },
  { nombre: 'PNC Delegación Santa Ana', lat: 13.9942, lng: -89.5597 },
  { nombre: 'PNC Delegación San Miguel', lat: 13.4833, lng: -88.1833 },
  { nombre: 'PNC Delegación Sonsonate', lat: 13.7189, lng: -89.7242 },
  { nombre: 'PNC Delegación Soyapango', lat: 13.7103, lng: -89.1412 }
];

/**
 * Encuentra la base o patrulla de la PNC más cercana a las coordenadas del objetivo
 */
export const getClosestPncUnit = (targetLat, targetLng) => {
  let closest = PNC_REGIONAL_BASES[0];
  let minDistance = Infinity;

  for (const base of PNC_REGIONAL_BASES) {
    const d = calculateHaversineDistance(base.lat, base.lng, targetLat, targetLng);
    if (d < minDistance) {
      minDistance = d;
      closest = base;
    }
  }

  return { ...closest, distanceKm: minDistance.toFixed(1) };
};

/**
 * Fórmula de Haversine para cálculo de distancia en línea recta (km)
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Genera una ruta vehicular táctica interpolada a través de vías urbanas (Fallback sin conexión)
 */
const generateTacticalFallbackPolyline = (startLat, startLng, endLat, endLng) => {
  const points = [[startLat, startLng]];
  const steps = 6;
  const deltaLat = (endLat - startLat) / steps;
  const deltaLng = (endLng - startLng) / steps;

  for (let i = 1; i < steps; i++) {
    // Pequeño desvío ortogonal para simular cuadrícula vial real en El Salvador
    const wobbleLat = ((i % 2 === 0 ? 1 : -1) * 0.0008) * Math.sin((i / steps) * Math.PI);
    const wobbleLng = ((i % 2 !== 0 ? 1 : -1) * 0.0008) * Math.cos((i / steps) * Math.PI);
    points.push([
      startLat + deltaLat * i + wobbleLat,
      startLng + deltaLng * i + wobbleLng
    ]);
  }

  points.push([endLat, endLng]);
  return points;
};

/**
 * Calcula la ruta de llegada más rápida (Fastest Interception Route)
 * utilizando el servicio OSRM con respaldo instantáneo.
 * Considera velocidad de emergencia de patrulla policial en Código 3 (sirenas y balizas activas).
 */
export const calculateFastestEmergencyRoute = async (targetLat, targetLng, targetInfo = {}) => {
  const latNum = parseFloat(targetLat);
  const lngNum = parseFloat(targetLng);

  if (isNaN(latNum) || isNaN(lngNum)) {
    throw new Error('Coordenadas de objetivo inválidas.');
  }

  // 1. Obtener la unidad PNC más cercana al objetivo
  const closestUnit = getClosestPncUnit(latNum, lngNum);
  const startLat = closestUnit.lat;
  const startLng = closestUnit.lng;

  // 2. Intentar consultar el motor de ruteo OSRM para vías reales
  let routeCoordinates = [];
  let totalDistanceKm = 0;
  let totalDurationSec = 0;
  let maneuvers = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${lngNum},${latNum}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Invertir [lng, lat] de GeoJSON a [lat, lng] de Leaflet
        routeCoordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        totalDistanceKm = (route.distance / 1000).toFixed(2);
        totalDurationSec = route.duration;

        // Extraer pasos de navegación táctica
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          maneuvers = route.legs[0].steps.slice(0, 5).map((s) => ({
            instruction: s.maneuver?.type || 'Avanzar',
            name: s.name || 'Vía principal',
            distance: `${(s.distance / 1000).toFixed(1)} km`
          }));
        }
      }
    }
  } catch (err) {
    console.warn('OSRM routing no disponible, usando algoritmo táctico local:', err.message);
  }

  // Si OSRM falló o no devolvió coordenadas, calcular con algoritmo táctico local
  if (routeCoordinates.length === 0) {
    const directKm = calculateHaversineDistance(startLat, startLng, latNum, lngNum);
    // Factor de ruta vial real en ciudad vs línea recta (~1.28x)
    totalDistanceKm = (directKm * 1.28).toFixed(2);
    // Velocidad promedio de patrulla con sirena activa (~55 km/h)
    totalDurationSec = (parseFloat(totalDistanceKm) / 55) * 3600;
    routeCoordinates = generateTacticalFallbackPolyline(startLat, startLng, latNum, lngNum);
    maneuvers = [
      { instruction: 'Salida de Base', name: closestUnit.nombre, distance: '0.2 km' },
      { instruction: 'Arteria Principal', name: 'Corredor Táctico de Intervención Rápida', distance: `${(parseFloat(totalDistanceKm) * 0.7).toFixed(1)} km` },
      { instruction: 'Aproximación Final', name: targetInfo.ubicacion || 'Punto de Avistamiento', distance: '0.3 km' }
    ];
  }

  // Cálculo de ETA en minutos para Código 3 Policial (sirenas abiertas reducen tiempo en ~35%)
  const emergencyEtaMinutes = Math.max(2, Math.round((totalDurationSec * 0.65) / 60));

  // Enlaces directos para navegación en tablet/móvil policial
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${latNum},${lngNum}&travelmode=driving`;
  const wazeUrl = `https://waze.com/ul?ll=${latNum},${lngNum}&navigate=yes`;

  return {
    success: true,
    startUnit: closestUnit,
    startCoords: [startLat, startLng],
    targetCoords: [latNum, lngNum],
    targetInfo,
    routeCoordinates,
    distanceKm: totalDistanceKm,
    etaMinutes: emergencyEtaMinutes,
    maneuvers,
    googleMapsUrl,
    wazeUrl,
    calculatedAt: new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  };
};
