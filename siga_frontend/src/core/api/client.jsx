export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class SIGAApiClient {
  constructor() {
    this.baseURL = API_BASE;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        this.clearToken();
        window.location.reload();
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request(`/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
      method: 'POST'
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async register(email, password, fullName) {
    return this.request(`/auth/register?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&full_name=${encodeURIComponent(fullName)}`, {
      method: 'POST'
    });
  }

  // Module proxy calls
  async callModule(moduleName, endpoint, method = 'GET', data = null) {
    return this.request(`/api/${moduleName}/${endpoint}`, {
      method,
      body: data ? JSON.stringify(data) : null
    });
  }

  // Core system endpoints
  async getSystemStatus() {
    return this.request('/core/status');
  }

  async getModules() {
    return this.request('/core/modules');
  }
}

export const apiClient = new SIGAApiClient();