const API_BASE = 'http://localhost:8000';

export const api = {
  // Auth endpoints
  async login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login?email=${email}&password=${password}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return await response.json();
  },

  async register(email, password, fullName) {
    const response = await fetch(
      `${API_BASE}/auth/register?email=${email}&password=${password}&full_name=${fullName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return await response.json();
  },

  async getCurrentUser(token) {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await response.json();
  },

  // Module endpoints (ejemplo)
  async getModuleData(moduleName, endpoint, token) {
    const response = await fetch(`${API_BASE}/api/${moduleName}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return await response.json();
  }
};