import axios from 'axios';
import { useToast } from './ToastContext';

const API_URL = '';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export function useApi() {
  const { addToast } = useToast();

  const request = async (method, url, data = null, options = {}) => {
    try {
      const config = {
        method,
        url: `${url}?t=${Date.now()}`, // Cache busting
        ...options,
      };

      if (data) {
        config.data = data;
      }

      const response = await api(config);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'An error occurred. Please try again.';
      
      addToast(errorMessage, 'error');
      console.error(`API Error [${method} ${url}]:`, error);
      throw error;
    }
  };

  return {
    get: (url, options) => request('GET', url, null, options),
    post: (url, data, options) => request('POST', url, data, options),
    put: (url, data, options) => request('PUT', url, data, options),
    delete: (url, options) => request('DELETE', url, null, options),
    upload: (url, formData) =>
      request('POST', url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  };
}

export default useApi;
