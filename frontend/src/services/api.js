import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Error en la API:', error.response.status, error.response.data);
      if (error.response.status === 422 && error.response.data?.detail) {
        const details = error.response.data.detail;
        if (Array.isArray(details)) {
          const msgs = details.map((d) => `${d.loc.join('.')}: ${d.msg}`).join(', ');
          console.error('Detalles de validación:', msgs);
        } else {
          console.error('Detalle:', details);
        }
      }
    } else {
      console.error('Error en la API:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
