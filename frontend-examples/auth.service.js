import apiService from './api.service';

const ENDPOINTS = {
  SIGNUP: '/user/signup',
  SIGNIN: '/user/signin',
  GOOGLE_AUTH: '/user/googleAuth',
  DASHBOARD: '/user/dashboard',
};

class AuthService {
  async register(userData) {
    const response = await apiService.post(ENDPOINTS.SIGNUP, userData, { auth: false });
    
    if (response.success && response.data.token) {
      apiService.setToken(response.data.token);
    }
    
    return response.data;
  }

  async login(email, password, remember = true) {
    const response = await apiService.post(
      ENDPOINTS.SIGNIN,
      { email, password },
      { auth: false }
    );
    
    if (response.success && response.data.token) {
      apiService.setToken(response.data.token, remember);
    }
    
    return response.data;
  }

  async googleLogin(googleToken) {
    const response = await apiService.post(
      ENDPOINTS.GOOGLE_AUTH,
      { googleToken },
      { auth: false }
    );
    
    if (response.success && response.data.token) {
      apiService.setToken(response.data.token);
    }
    
    return response.data;
  }

  async getCurrentUser() {
    const response = await apiService.get(ENDPOINTS.DASHBOARD);
    return response.data.user;
  }

  logout() {
    apiService.removeToken();
    if (window.chatSocket) {
      window.chatSocket.disconnect();
    }
  }

  isAuthenticated() {
    return !!apiService.getToken();
  }
}

export default new AuthService();
