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
        const config = {
            headers: this.getHeaders(),
            credentials: 'include',
            ...options
        };
        try {
            const response = await fetch(url, config);
            let data = null;
            try { data = await response.clone().json(); } catch (_) {}
            return {
                success: response.ok,
                status: response.status,
                data,
                message: data?.message || (response.ok ? undefined : this.getErrorMessage(new Error(String(response.status))))
            };
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
        const body = JSON.stringify({
            session_id: sessionId,
            messages: [{ role: 'user', content: message }]
        });
        // 1차: 표준 엔드포인트
        let res = await this.request(API_CONFIG.ENDPOINTS.CHAT, {
            method: 'POST',
            body
        });
        // 404/405면 구엔드포인트로 1회 재시도
        if (!res.success && (res.status === 404 || res.status === 405)) {
            res = await this.request('/api/ai/chat', { method: 'POST', body });
        }
        return res;
    }

    async getProducts(category = '') {
        const endpoint = category ? `${API_CONFIG.ENDPOINTS.PRODUCTS}?category=${category}` : API_CONFIG.ENDPOINTS.PRODUCTS;
        return await this.request(endpoint, { method: 'GET' });
    }

    async getEstimateList() {
        return await this.request(API_CONFIG.ENDPOINTS.ESTIMATE_LIST, { method: 'GET' });
    }

    async requestEstimate(requirements, sessionId) {
        const query = requirements.query || requirements;
        return await this.sendChatMessage(query, sessionId);
    }

    async saveEstimate(estimateObject, sessionId) {
        // 서버는 title, totalPrice를 상위 레벨에서 기대하므로(없으면 기본값으로 저장) 함께 전송
        const payload = {
            session_id: sessionId,
            title: estimateObject?.title || 'AI 추천 견적',
            totalPrice: typeof estimateObject?.total_price === 'number'
                ? Math.round(estimateObject.total_price)
                : (typeof estimateObject?.totalPrice === 'number' ? Math.round(estimateObject.totalPrice) : 0),
            estimate: estimateObject
        };
        return await this.request(API_CONFIG.ENDPOINTS.ESTIMATE_SAVE, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async deleteEstimate(id) {
        return await this.request(`${API_CONFIG.ENDPOINTS.ESTIMATE}/${id}`, {
            method: 'DELETE'
        });
    }
}

export const apiService = new APIService();
export default apiService;


