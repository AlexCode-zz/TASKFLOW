// TaskFlow - Utilidades de planificación y helpers (Fases futuras)

export const formatTime = (date) => {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

export const getDayName = (index) => {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  return days[index] || '';
};
