import apiClient from './apiClient.js';

/**
 * Auth API helpers.
 * Field names match the existing backend exactly:
 *   register → { name, email, mobile, password }
 *   login    → { identifier, password }
 */

/**
 * Register a new user.
 * @param {{ name: string, email: string, mobile: string, password: string }} data
 */
export async function registerUser(data) {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
}

/**
 * Log in with email or mobile + password.
 * @param {{ identifier: string, password: string }} data
 */
export async function loginUser(data) {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
}

/**
 * Log out — sends the HttpOnly cookie so the backend can revoke the session.
 */
export async function logoutUser() {
  const response = await apiClient.post('/auth/logout');
  return response.data;
}

/**
 * Fetch the profile of the currently authenticated user.
 */
export async function getMe() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}
