import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 🌐 ADD LANGUAGE HEADER FOR GOOGLE TRANSLATE
    const language = localStorage.getItem('language') || 'en';
    config.headers['Accept-Language'] = language;
    config.headers['x-lang'] = language;
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    // Log API calls in development
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
        language,
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      language: error.config?.headers?.['Accept-Language'],
    });
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - clearing token and redirecting to login');
      localStorage.removeItem('adminToken');
      // Clear language preference? Keep it - user might want same language after login
      // localStorage.removeItem('language'); 
      window.location.href = '/login';
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.log('🚫 Forbidden - insufficient permissions');
      // You could show a notification here
    }
    
    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      console.log('🔥 Server error - please try again later');
      // You could show a toast notification here
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED' || !error.response) {
      console.log('🌐 Network error - check your connection');
      // You could show a toast notification here
    }
    
    return Promise.reject(error);
  }
);

// Helper methods for common queries
export const apiHelpers = {
  // Add pagination params to any request
  withPagination: (params: any = {}, page = 1, limit = 20) => ({
    ...params,
    page,
    limit,
  }),
  
  // Add sorting params
  withSort: (params: any = {}, sortBy: string, order: 'asc' | 'desc' = 'desc') => ({
    ...params,
    sort: order === 'desc' ? `-${sortBy}` : sortBy,
  }),
  
  // Add date range filters
  withDateRange: (params: any = {}, startDate?: Date, endDate?: Date) => ({
    ...params,
    ...(startDate && { startDate: startDate.toISOString() }),
    ...(endDate && { endDate: endDate.toISOString() }),
  }),
  
  // Add search query
  withSearch: (params: any = {}, query?: string) => ({
    ...params,
    ...(query && { q: query }),
  }),
};

export default api;
