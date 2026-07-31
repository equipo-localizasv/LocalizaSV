import MapaAlertas from './MapaAlertas';

/**
 * Componente AlertsMap (Alias / Wrapper de MapaAlertas para compatibilidad total)
 */
const AlertsMap = (props) => {
  return <MapaAlertas {...props} />;
};

export default AlertsMap;
