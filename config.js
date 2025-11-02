// PC Builder API 설정 파일
// 실제 사용시 이 파일의 값들을 백엔드 서버 정보로 변경하세요

const BASE_CONFIG = {
    // 백엔드 서버 기본 URL (Spring Boot 서버)
    BASE_URL: 'http://localhost:8080',
    
    // API 키 (백엔드에서 제공하는 키)
    API_KEY: 'test-api-key',
    
    // API 엔드포인트들
    ENDPOINTS: {
        // Spring Boot 백엔드 API
        LOGIN: '/api/login',
        REGISTER: '/api/register',
        USER: '/api/user',
        HOME: '/',
        SECURE: '/secure',
        
        // PC Builder 전용 엔드포인트
        PRODUCTS: '/api/products',
        ESTIMATE: '/api/estimate',
        CHAT: '/api/chat'
    },
    
    // 요청 타임아웃 (밀리초)
    TIMEOUT: 10000,
    
    // 재시도 설정
    RETRY: {
        MAX_ATTEMPTS: 3,
        DELAY: 1000
    }
};

// 환경별 설정
const ENV_CONFIG = {
    development: {
        BASE_URL: 'http://localhost:8081',
        API_KEY: 'dev-api-key',
        DEBUG: true
    },
    production: {
        BASE_URL: 'https://api.pcbuilder.com/api',
        API_KEY: 'prod-api-key',
        DEBUG: false
    },
    staging: {
        BASE_URL: 'https://staging-api.pcbuilder.com/api',
        API_KEY: 'staging-api-key',
        DEBUG: true
    }
};

// 현재 환경 설정 (개발/스테이징/프로덕션)
const CURRENT_ENV = 'development'; // OpenAI API 사용

// 최종 설정 객체
const FINAL_CONFIG = {
    ...BASE_CONFIG,
    ...ENV_CONFIG[CURRENT_ENV]
};

// 설정 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FINAL_CONFIG;
} else {
    window.API_CONFIG = FINAL_CONFIG;
}
