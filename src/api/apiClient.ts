import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.select({
  web: 'http://localhost:3001/api',
  default: 'http://10.0.0.132:3001/api', // IP LAN de tu PC para dispositivos físicos iOS/Android
});

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('finanzas_jwt_token');
    } catch (e) {
      // Ignorar si AsyncStorage no está listo
    }
  }

  public async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('finanzas_jwt_token', token);
    } else {
      await AsyncStorage.removeItem('finanzas_jwt_token');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  public async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      const data = await response.json();
      return {
        success: response.ok,
        data,
        error: response.ok ? undefined : data.error,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Servidor offline o inaccesible',
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return {
        success: response.ok,
        data,
        error: response.ok ? undefined : data.error,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error de conexión',
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return {
        success: response.ok,
        data,
        error: response.ok ? undefined : data.error,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error de conexión',
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const data = await response.json();
      return {
        success: response.ok,
        data,
        error: response.ok ? undefined : data.error,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error de conexión',
        timestamp: new Date().toISOString(),
      };
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public async register(name: string, email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const res = await this.post<{ token: string; user: any }>('/auth/register', { name, email, password });
    if (res.success && res.data?.token) {
      await this.setToken(res.data.token);
    }
    return res;
  }

  public async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const res = await this.post<{ token: string; user: any }>('/auth/login', { email, password });
    if (res.success && res.data?.token) {
      await this.setToken(res.data.token);
    }
    return res;
  }

  public async authGoogle(credential: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const res = await this.post<{ token: string; user: any }>('/auth/google', { credential });
    if (res.success && res.data?.token) {
      await this.setToken(res.data.token);
    }
    return res;
  }

  public async authApple(payload: {
    identityToken: string;
    fullName?: any;
    user?: string;
    email?: string;
  }): Promise<ApiResponse<{ token: string; user: any }>> {
    const res = await this.post<{ token: string; user: any }>('/auth/apple', payload);
    if (res.success && res.data?.token) {
      await this.setToken(res.data.token);
    }
    return res;
  }

  public async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/auth/forgot-password', { email });
  }

  public async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/auth/reset-password', { token, newPassword });
  }

  public async getMe(): Promise<ApiResponse<any>> {
    return this.get<any>('/auth/me');
  }

  public async logout(): Promise<void> {
    await this.setToken(null);
  }
}

export const apiClient = new ApiClient();

