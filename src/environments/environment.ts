/**
 * Dirección del backend.
 * En desarrollo, "ng serve" reenvía todo lo que empieza con /api al backend
 * (http://127.0.0.1:8081), según proxy.conf.json. Así no hay problemas de CORS.
 * Si el backend corre en otra dirección, cámbiala en proxy.conf.json.
 */
export const environment = {
  apiUrl: '/api/v1',
};
