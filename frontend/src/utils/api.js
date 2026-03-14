import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
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
        if (error.response && error.response.status === 401) {
            // Optional: Handle token expiration logic, e.g. logout user
            // localStorage.removeItem('user');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
