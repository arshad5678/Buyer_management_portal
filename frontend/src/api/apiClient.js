/**
 * Centralised Axios API client.
 *
 * Base URL is read from the VITE_API_URL environment variable.
 * Falls back to http://localhost:5001/api for local development.
 *
 * withCredentials: true  — sends the HttpOnly refreshToken cookie
 * on every request so the backend can rotate it transparently.
 */
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,           // required for HttpOnly cookie handling
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor — attaches the JWT access token stored in
 * sessionStorage if present.  sessionStorage is cleared when the
 * browser tab/window closes, which matches the 10-minute idle
 * session behaviour on the backend.
 */
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor — on 401, attempt a silent token refresh
 * once using the HttpOnly cookie.  If the refresh also fails,
 * clear the stored token and let the caller handle the 401.
 */
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, once per request, and not for
    // the refresh or login endpoints themselves.
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/logout');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        // Queue subsequent requests while a refresh is in flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh');
        const newToken = data?.data?.accessToken;
        if (newToken) {
          sessionStorage.setItem('accessToken', newToken);
          apiClient.defaults.headers['Authorization'] = `Bearer ${newToken}`;
          processQueue(null, newToken);
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
        throw new Error('No access token in refresh response');
      } catch (refreshError) {
        processQueue(refreshError, null);
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('user');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
