// React용 ESM 구성 (pc_builder/src/config.js로 복사)
const BASE_CONFIG = {
    BASE_URL: 'http://localhost:8081',
    API_KEY: 'test-api-key',
    ENDPOINTS: {
        LOGIN: '/api/login',
        REGISTER: '/api/register',
        USER: '/api/user',
        HOME: '/',
        SECURE: '/secure',
        PRODUCTS: '/api/products',
        ESTIMATE: '/api/estimate',
        CHAT: '/api/chat'
    },
    TIMEOUT: 10000,
    RETRY: { MAX_ATTEMPTS: 3, DELAY: 1000 }
};

const ENV_CONFIG = {
    development: { BASE_URL: 'http://localhost:8081', API_KEY: 'dev-api-key', DEBUG: true },
    production: { BASE_URL: 'https://api.pcbuilder.com/api', API_KEY: 'prod-api-key', DEBUG: false },
    staging: { BASE_URL: 'https://staging-api.pcbuilder.com/api', API_KEY: 'staging-api-key', DEBUG: true }
};

const CURRENT_ENV = import.meta.env.MODE || 'development';

export const API_CONFIG = {
    ...BASE_CONFIG,
    ...(ENV_CONFIG[CURRENT_ENV] || {})
};

export default API_CONFIG;


