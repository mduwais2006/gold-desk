import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.MODE === 'production' 
             ? `${window.location.origin}/api` 
             : 'http://localhost:5001/api',
});

// Request interceptor to add the auth token header to requests
api.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle global errors like 401 Unauthorized
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            console.error(`[API ERROR] ${error.config.method.toUpperCase()} ${error.config.url}:`, error.response.status, error.response.data);
        } else if (error.request) {
            console.error(`[NETWORK ERROR] No response from server. Check if backend is running at ${error.config.baseURL}`);
        } else {
            console.error('[REQ ERROR]', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
