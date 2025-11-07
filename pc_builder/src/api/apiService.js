import { API_CONFIG } from '../config.js';

class APIService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.apiKey = API_CONFIG.API_KEY;
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = { headers: this.getHeaders(), 
                        credentials: 'include',
                        ...options };
        try {
            const response = await fetch(url, config);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data && data.success === false) return { success: false, data };
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message, message: this.getErrorMessage(error) };
        }
    }

    getErrorMessage(error) {
        if (error.message.includes('401')) return '인증이 필요합니다. 다시 로그인해주세요.';
        if (error.message.includes('403')) return '접근 권한이 없습니다.';
        if (error.message.includes('404')) return '요청한 리소스를 찾을 수 없습니다.';
        if (error.message.includes('500')) return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
    }

    async login(username, password) {
        return await this.request(API_CONFIG.ENDPOINTS.LOGIN, { method: 'POST', body: JSON.stringify({ username, password }) });
    }

    async register(name, username, password) {
        return await this.request(API_CONFIG.ENDPOINTS.REGISTER, { method: 'POST', body: JSON.stringify({ name, username, password }) });
    }

    async sendChatMessage(message, sessionId) {
        return await this.request(API_CONFIG.ENDPOINTS.CHAT, {
            method: 'POST',
            body: JSON.stringify({
                session_id: sessionId,
                messages: [{ role: 'user', content: message }]
            })
        });
    }

    async getProducts(category = '') {
        const endpoint = category ? `${API_CONFIG.ENDPOINTS.PRODUCTS}?category=${category}` : API_CONFIG.ENDPOINTS.PRODUCTS;
        return await this.request(endpoint, { method: 'GET' });
    }

    async requestEstimate(requirements, sessionId) {
        const query = requirements.query || requirements;
        return await this.sendChatMessage(query, sessionId);
    }
}

export const apiService = new APIService();
export default apiService;


