/**
 * Complete API Service for Frontend
 * Copy this file to your frontend project: src/services/api.service.js
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.baseURL = API_URL;
  }

  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  setToken(token, remember = true) {
    if (remember) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }
  }

  removeToken() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  }

  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.auth !== false),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'Request failed',
          errors: data.errors || null,
        };
      }

      return data;
    } catch (error) {
      if (error.status === 401) {
        this.removeToken();
        window.location.href = '/login';
      }
      throw error;
    }
  }

  async get(endpoint, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.request(url, {
      method: 'GET',
      ...options,
    });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }
}

export default new ApiService();
