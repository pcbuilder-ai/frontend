// PC Builder - JavaScript 기능

// API 설정은 config.js에서 가져옵니다
// config.js 파일에서 API_CONFIG를 설정하세요

// API 통신을 위한 서비스 클래스
class APIService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.apiKey = API_CONFIG.API_KEY;
    }

    // 공통 헤더 설정 (OpenAI API 형식)
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };
    }

    // 공통 API 요청 메서드
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            // 백엔드가 200으로 에러 바디를 내려주는 경우(success:false) 실패로 처리
            if (data && data.success === false) {
                return { success: false, data };
            }
            return { success: true, data };
        } catch (error) {
            console.error('API 요청 실패:', error);
            return { 
                success: false, 
                error: error.message,
                message: this.getErrorMessage(error)
            };
        }
    }

    // 에러 메시지 처리
    getErrorMessage(error) {
        if (error.message.includes('401')) {
            return '인증이 필요합니다. 다시 로그인해주세요.';
        } else if (error.message.includes('403')) {
            return '접근 권한이 없습니다.';
        } else if (error.message.includes('404')) {
            return '요청한 리소스를 찾을 수 없습니다.';
        } else if (error.message.includes('500')) {
            return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else {
            return '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
        }
    }

    // 로그인 API (백엔드 Spring Boot와 연결)
    async login(username, password) {
        return await this.request(API_CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    // 회원가입 API
    async register(name, username, password) {
        return await this.request(API_CONFIG.ENDPOINTS.REGISTER, {
            method: 'POST',
            body: JSON.stringify({ name, username, password })
        });
    }

    // 챗봇 메시지 전송 API (OpenAI Chat Completions)
    async sendChatMessage(message) {
        const prompt = `당신은 PC 견적 전문가입니다. 사용자의 요청에 따라 적절한 PC 견적을 제공해주세요.
        
사용자 요청: ${message}

다음 형식으로 응답해주세요:
💻 **추천 사양**
• CPU: [CPU 모델]
• GPU: [GPU 모델] 
• RAM: [메모리 용량]
• SSD: [저장장치 용량]
• 기타: [기타 부품]

💰 **예상 가격: [가격]**

[추가 설명 및 추천 이유]`;

        return await this.request(API_CONFIG.ENDPOINTS.CHAT, {
            method: 'POST',
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "당신은 PC 견적 전문가입니다. 사용자의 요청에 따라 적절한 PC 견적을 제공해주세요."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
    }

    // 제품 목록 조회 API
    async getProducts(category = '') {
        const endpoint = category ? 
            `${API_CONFIG.ENDPOINTS.PRODUCTS}?category=${category}` : 
            API_CONFIG.ENDPOINTS.PRODUCTS;
        return await this.request(endpoint, {
            method: 'GET'
        });
    }

    // 견적 요청 API (OpenAI Chat Completions 사용)
    async requestEstimate(requirements) {
        const query = requirements.query || requirements;
        return await this.sendChatMessage(query);
    }
}

// API 서비스 인스턴스 생성
const apiService = new APIService();

// 알림 시스템
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // 알림 요소 생성
    const notification = document.createElement('div');
    notification.className = 'notification fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full';
    
    // 타입별 스타일 설정
    const styles = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-black',
        info: 'bg-blue-500 text-white'
    };
    
    notification.className += ` ${styles[type] || styles.info}`;
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="tilt-warp text-sm font-medium">${message}</span>
            <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 애니메이션으로 표시
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // 자동 제거 (5초 후)
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// 로그인 상태 확인 및 버튼 업데이트
function updateLoginButton() {
    const userName = localStorage.getItem('userName');
    const userToken = localStorage.getItem('userToken');
    
    if (userName && userToken) {
        // 로그인된 상태 - 모든 로그인 버튼을 사용자명으로 변경
        const loginButtons = document.querySelectorAll('button.login-button');
        loginButtons.forEach(button => {
            if (button.textContent.includes('로그인')) {
                button.textContent = `${userName}님`;
                button.classList.remove('login-button');
                button.classList.add('user-button');
                button.onclick = logout;
                button.style.marginRight = '10px';
            }
        });
        
        // 로그아웃 버튼 추가
        addLogoutButton();
    } else {
        // 로그아웃된 상태 - 로그인 버튼으로 되돌리기
        const userButtons = document.querySelectorAll('button.user-button');
        userButtons.forEach(button => {
            if (button.textContent.includes('님')) {
                button.textContent = '로그인';
                button.classList.remove('user-button');
                button.classList.add('login-button');
                button.onclick = null;
                button.style.marginRight = '0px';
            }
        });
        
        // 로그아웃 버튼 제거
        removeLogoutButton();
    }
}

// 로그아웃 버튼 추가
function addLogoutButton() {
    // 이미 로그아웃 버튼이 있으면 추가하지 않음
    if (document.getElementById('logoutButton')) return;
    
    const userButtons = document.querySelectorAll('button.user-button');
    userButtons.forEach(button => {
        if (button.textContent.includes('님')) {
            const logoutButton = document.createElement('button');
            logoutButton.id = 'logoutButton';
            logoutButton.textContent = '로그아웃';
            logoutButton.className = 'tilt-warp px-4 py-2 rounded-lg hover:opacity-80';
            logoutButton.style.cssText = 'font-size: 18px; background-color: #dc3545; color: white; margin-left: 10px;';
            logoutButton.onclick = logout;
            
            // 로그인 버튼 다음에 로그아웃 버튼 추가
            button.parentNode.insertBefore(logoutButton, button.nextSibling);
        }
    });
}

// 로그아웃 버튼 제거
function removeLogoutButton() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.remove();
    }
}

// 로그아웃 기능
function logout() {
    // 로컬 스토리지에서 사용자 정보 제거
    localStorage.removeItem('userToken');
    localStorage.removeItem('userUsername');
    localStorage.removeItem('userName');
    
    showNotification('로그아웃되었습니다.', 'info');
    
    // 로그인 버튼으로 되돌리기
    updateLoginButton();
}

// 사용자 데이터 관리 시스템
class UserManager {
    constructor() {
        this.currentUser = null;
        this.loadCurrentUser();
    }
    
    // 현재 사용자 로드
    loadCurrentUser() {
        const token = localStorage.getItem('userToken');
        const username = localStorage.getItem('userUsername');
        const name = localStorage.getItem('userName');
        
        if (token && username && name) {
            this.currentUser = {
                token: token,
                username: username,
                name: name
            };
        }
    }
    
    // 사용자 로그인
    login(username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            this.currentUser = {
                token: 'local-token-' + Date.now(),
                username: user.username,
                name: user.name,
                id: user.id
            };
            
            // 로컬 스토리지에 저장
            localStorage.setItem('userToken', this.currentUser.token);
            localStorage.setItem('userUsername', this.currentUser.username);
            localStorage.setItem('userName', this.currentUser.name);
            localStorage.setItem('userId', this.currentUser.id);
            
            return { success: true, user: this.currentUser };
        }
        
        return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }
    
    // 사용자 회원가입
    register(name, username, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // 아이디 중복 확인
        if (users.find(u => u.username === username)) {
            return { success: false, message: '이미 사용 중인 아이디입니다.' };
        }
        
        // 새 사용자 생성
        const newUser = {
            id: Date.now(),
            name: name,
            username: username,
            password: password,
            createdAt: new Date().toISOString(),
            preferences: {
                budget: null,
                purpose: null,
                favoriteBrands: []
            }
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        return { success: true, user: newUser };
    }
    
    // 사용자 로그아웃
    logout() {
        this.currentUser = null;
        localStorage.removeItem('userToken');
        localStorage.removeItem('userUsername');
        localStorage.removeItem('userName');
        localStorage.removeItem('userId');
    }
    
    // 로그인 상태 확인
    isLoggedIn() {
        return this.currentUser !== null;
    }
    
    // 현재 사용자 정보 가져오기
    getCurrentUser() {
        return this.currentUser;
    }
    
    // 사용자 설정 업데이트
    updatePreferences(preferences) {
        if (!this.currentUser) return false;
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.username === this.currentUser.username);
        
        if (userIndex !== -1) {
            users[userIndex].preferences = { ...users[userIndex].preferences, ...preferences };
            localStorage.setItem('users', JSON.stringify(users));
            return true;
        }
        
        return false;
    }
    
    // 사용자 설정 가져오기
    getPreferences() {
        if (!this.currentUser) return null;
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === this.currentUser.username);
        
        return user ? user.preferences : null;
    }
    
    // 사용자 견적 기록 저장
    saveEstimate(estimate) {
        if (!this.currentUser) return false;
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.username === this.currentUser.username);
        
        if (userIndex !== -1) {
            if (!users[userIndex].estimates) {
                users[userIndex].estimates = [];
            }
            
            users[userIndex].estimates.push({
                id: Date.now(),
                query: estimate.query,
                response: estimate.response,
                createdAt: new Date().toISOString()
            });
            
            localStorage.setItem('users', JSON.stringify(users));
            return true;
        }
        
        return false;
    }
    
    // 사용자 견적 기록 가져오기
    getEstimates() {
        if (!this.currentUser) return [];
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.username === this.currentUser.username);
        
        return user ? (user.estimates || []) : [];
    }
}

// 사용자 관리자 인스턴스 생성
const userManager = new UserManager();

// 페이지 로드시 로그인 상태 확인
document.addEventListener('DOMContentLoaded', () => {
    // 로그인 상태 확인 및 버튼 업데이트
    updateLoginButton();
    
    // 모든 화면에서 로그인 상태 동기화
    const allScreens = [loginScreen, chatbotScreen, signupScreen];
    allScreens.forEach(screen => {
        if (screen && !screen.classList.contains('hidden')) {
            updateLoginButton();
        }
    });
});

// 다크모드 토글 기능
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeToggleLogin = document.getElementById('darkModeToggleLogin');
const html = document.documentElement;

// 로컬 스토리지에서 다크모드 상태 확인
const isDarkMode = localStorage.getItem('darkMode') === 'true';

if (isDarkMode) {
    html.classList.add('dark');
}

// 다크모드 토글 함수
const toggleDarkMode = () => {
    html.classList.toggle('dark');
    const isDark = html.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
};

darkModeToggle.addEventListener('click', toggleDarkMode);
darkModeToggleLogin.addEventListener('click', toggleDarkMode);

// 로그인 화면 전환 기능
const loginButton = document.getElementById('mainLoginButton');
const chatHeaderLoginButton = document.getElementById('chatHeaderLoginButton');
const loginScreen = document.getElementById('loginScreen');
const backToMainButton = document.getElementById('backToMain');
const loginSubmitButton = document.getElementById('loginSubmit');

// 로그인 버튼 업데이트 함수
function updateLoginButton() {
    const userName = localStorage.getItem('userName');
    const userToken = localStorage.getItem('userToken');
    
    if (userName && userToken) {
        // 메인 화면 로그인 상태: 사용자명 표시
        if (loginButton) {
            loginButton.textContent = `${userName}님`;
            loginButton.classList.remove('login-button');
            loginButton.classList.add('user-button');
        }
        
        // 챗봇 헤더 로그인 상태: 사용자명 표시
        if (chatHeaderLoginButton) {
            chatHeaderLoginButton.textContent = `${userName}님`;
            chatHeaderLoginButton.classList.remove('login-button');
            chatHeaderLoginButton.classList.add('user-button');
        }
        
        // 로그아웃 버튼 추가
        addLogoutButton();
        addChatHeaderLogoutButton();
    } else {
        // 로그아웃 상태: 로그인 텍스트 표시
        if (loginButton) {
            loginButton.textContent = '로그인';
            loginButton.classList.remove('user-button');
            loginButton.classList.add('login-button');
        }
        
        // 챗봇 헤더 로그아웃 상태
        if (chatHeaderLoginButton) {
            chatHeaderLoginButton.textContent = '로그인';
            chatHeaderLoginButton.classList.remove('user-button');
            chatHeaderLoginButton.classList.add('login-button');
        }
        
        // 로그아웃 버튼 제거
        removeLogoutButton();
        removeChatHeaderLogoutButton();
    }
}

// 로그아웃 버튼 추가 함수
function addLogoutButton() {
    // 이미 로그아웃 버튼이 있으면 추가하지 않음
    if (document.getElementById('logoutButton')) return;
    
    if (!loginButton) return;
    
    const logoutButton = document.createElement('button');
    logoutButton.id = 'logoutButton';
    logoutButton.textContent = '로그아웃';
    logoutButton.className = 'tilt-warp px-6 py-3 rounded-lg font-bold transition-all duration-300';
    logoutButton.style.cssText = 'background-color: #ef4444; color: white !important; margin-left: 10px; border: none;';
    
    logoutButton.addEventListener('click', () => {
        // 로컬 스토리지 정리
        localStorage.removeItem('userToken');
        localStorage.removeItem('userUsername');
        localStorage.removeItem('userName');
        
        // 로그인 버튼 업데이트
        updateLoginButton();
        
        // 알림 표시
        showNotification('로그아웃되었습니다.', 'info');
    });
    
    // 로그인 버튼 옆에 추가
    loginButton.parentNode.insertBefore(logoutButton, loginButton.nextSibling);
}

// 로그아웃 버튼 제거 함수
function removeLogoutButton() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.remove();
    }
}

// 챗봇 헤더 로그아웃 버튼 추가 함수
function addChatHeaderLogoutButton() {
    // 이미 로그아웃 버튼이 있으면 추가하지 않음
    if (document.getElementById('chatHeaderLogoutButton')) return;
    
    if (!chatHeaderLoginButton) return;
    
    const logoutButton = document.createElement('button');
    logoutButton.id = 'chatHeaderLogoutButton';
    logoutButton.textContent = '로그아웃';
    logoutButton.className = 'tilt-warp px-6 py-2 rounded-lg transition-all duration-300';
    logoutButton.style.cssText = 'background-color: #ef4444; color: white !important; margin-left: 10px; border: none; font-size: 20px;';
    
    logoutButton.addEventListener('click', () => {
        // 로컬 스토리지 정리
        localStorage.removeItem('userToken');
        localStorage.removeItem('userUsername');
        localStorage.removeItem('userName');
        
        // 로그인 버튼 업데이트
        updateLoginButton();
        
        // 알림 표시
        showNotification('로그아웃되었습니다.', 'info');
    });
    
    // 챗봇 헤더 로그인 버튼 옆에 추가
    chatHeaderLoginButton.parentNode.insertBefore(logoutButton, chatHeaderLoginButton.nextSibling);
}

// 챗봇 헤더 로그아웃 버튼 제거 함수
function removeChatHeaderLogoutButton() {
    const logoutButton = document.getElementById('chatHeaderLogoutButton');
    if (logoutButton) {
        logoutButton.remove();
    }
}

// 페이지 로드 시 로그인 상태 확인
updateLoginButton();

// 로그인 버튼 클릭시 로그인 화면 표시 (로그인되지 않은 경우만)
if (loginButton) {
    loginButton.addEventListener('click', () => {
        const userName = localStorage.getItem('userName');
        const userToken = localStorage.getItem('userToken');
        
        if (!userName || !userToken) {
            loginScreen.classList.remove('hidden');
        }
    });
}

// 챗봇 헤더 로그인 버튼 클릭 이벤트
if (chatHeaderLoginButton) {
    chatHeaderLoginButton.addEventListener('click', () => {
        const userName = localStorage.getItem('userName');
        const userToken = localStorage.getItem('userToken');
        
        if (!userName || !userToken) {
            loginScreen.classList.remove('hidden');
        }
    });
}

// 뒤로가기 버튼 클릭시 메인 화면으로 돌아가기
backToMainButton.addEventListener('click', () => {
    loginScreen.classList.add('hidden');
    // 로그인 상태 유지
    updateLoginButton();
});

// 로그인 폼 제출 (백엔드 API와 연결)
loginSubmitButton.addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value; // 로그인 사용자명 필드
    const password = document.getElementById('loginPassword').value; // 로그인 비밀번호 필드
    
    console.log('로그인 시도:', { username, password: '***' }); // 디버깅용 로그
    
    if (!username || !password) {
        showNotification('사용자명과 비밀번호를 입력해주세요.', 'error');
        return;
    }

    try {
        console.log('API 호출 시작...'); // 디버깅용 로그
        // 백엔드 API 호출
        const result = await apiService.login(username, password);
        
        console.log('API 응답:', result); // 디버깅용 로그
        
        if (result.success && result.data.data && result.data.data.success) {
            showNotification(`로그인 성공! 환영합니다, ${result.data.data.user.username}님`, 'success');
            
            // 로컬 스토리지에 사용자 정보 저장
            localStorage.setItem('userToken', 'backend-token');
            localStorage.setItem('userUsername', result.data.data.user.username);
            localStorage.setItem('userName', result.data.data.user.username);
            
            console.log('로그인 성공, 메인화면으로 이동...'); // 디버깅용 로그
            
            // 로그인 화면 숨기고 메인화면으로 이동
            loginScreen.classList.add('hidden');
            
            // 로그인 버튼 텍스트 변경
            updateLoginButton();
            
            // 폼 초기화
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
        } else {
            console.log('로그인 실패:', result); // 디버깅용 로그
            showNotification(result.data?.data?.message || '로그인에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('로그인 오류:', error); // 디버깅용 로그
        showNotification('로그인 중 오류가 발생했습니다.', 'error');
    }
});

// 검색 기능
const searchInput = document.querySelector('input[type="text"]');
const searchButton = document.querySelector('main button');

searchButton.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    // 로딩 상태 표시
    const originalText = searchButton.textContent;
    searchButton.textContent = '분석 중...';
    searchButton.disabled = true;

    try {
        // 견적 요청 API 호출
        const result = await apiService.requestEstimate({ query });
        
        if (result.success) {
            // 챗봇 화면으로 이동
            chatbotScreen.classList.remove('hidden');
            // 기존 메시지 초기화
            chatMessages.innerHTML = '';
            // 사용자 질문과 AI 응답 추가
            addUserMessage(query);
            // OpenAI API 응답에서 메시지 추출
            const aiResponse = result.data.choices?.[0]?.message?.content || 
                             result.data.estimate || 
                             result.data.response || 
                             result.data.message || 
                             (typeof result.data === 'string' ? result.data : JSON.stringify(result.data));
            addAIMessage(aiResponse);
            
            // 로그인 상태 유지
            updateLoginButton();
        } else {
            // API 실패시 기본 동작
            chatbotScreen.classList.remove('hidden');
            chatMessages.innerHTML = '';
            addUserMessage(query);
            addAIMessage(getAIResponse(query));
            showNotification('견적 서비스에 일시적인 문제가 있습니다. 기본 응답을 제공합니다.', 'warning');
            
            // 로그인 상태 유지
            updateLoginButton();
        }
    } catch (error) {
        // 에러 발생시 기본 동작
        chatbotScreen.classList.remove('hidden');
        chatMessages.innerHTML = '';
        addUserMessage(query);
        addAIMessage(getAIResponse(query));
        showNotification('네트워크 오류가 발생했습니다. 기본 응답을 제공합니다.', 'error');
        
        // 로그인 상태 유지
        updateLoginButton();
    } finally {
        // 로딩 상태 해제
        searchButton.textContent = originalText;
        searchButton.disabled = false;
    }
});

// Enter 키로 검색
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchButton.click();
    }
});

// 반응형 네비게이션 (모바일용)
const createMobileMenu = () => {
    const header = document.querySelector('header');
    const nav = header.querySelector('nav');
    
    if (window.innerWidth < 768) {
        if (!document.querySelector('.mobile-menu')) {
            const mobileMenu = document.createElement('div');
            mobileMenu.className = 'mobile-menu md:hidden p-4';
            mobileMenu.style.backgroundColor = 'var(--figma-white)';
            mobileMenu.style.borderTop = '1px solid var(--figma-border)';
            mobileMenu.innerHTML = `
                <div class="flex flex-col space-y-4">
                    <a href="#" class="tilt-warp text-xl font-normal" style="color: var(--figma-gray-500);">견적</a>
                    <a href="#" class="tilt-warp text-xl font-normal" style="color: var(--figma-gray-500);">제품</a>
                    <a href="#" class="tilt-warp text-xl font-normal" style="color: var(--figma-gray-500);">전문가 추천</a>
                </div>
            `;
            header.appendChild(mobileMenu);
        }
    } else {
        const mobileMenu = document.querySelector('.mobile-menu');
        if (mobileMenu) {
            mobileMenu.remove();
        }
    }
};

// 초기 로드 및 리사이즈 이벤트
createMobileMenu();
window.addEventListener('resize', createMobileMenu);

// 챗봇 화면 기능
const chatbotScreen = document.getElementById('chatbotScreen');
const backToMainFromChatButton = document.getElementById('backToMainFromChat');
const darkModeToggleChatbot = document.getElementById('darkModeToggleChatbot');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessage');
const chatMessages = document.getElementById('chatMessages');

// 질문하기 버튼 클릭시 챗봇 화면 표시
searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        chatbotScreen.classList.remove('hidden');
        // 기존 메시지에 사용자 질문 추가
        addUserMessage(query);
    }
});

// 뒤로가기 버튼 클릭시 메인 화면으로 돌아가기
backToMainFromChatButton.addEventListener('click', () => {
    chatbotScreen.classList.add('hidden');
    // 로그인 상태 유지 (여러 번 실행하여 확실하게)
    updateLoginButton();
    setTimeout(() => {
        updateLoginButton();
    }, 100);
    setTimeout(() => {
        updateLoginButton();
    }, 300);
});

// 챗봇 다크모드 토글
darkModeToggleChatbot.addEventListener('click', toggleDarkMode);

// 페이지 포커스 시 로그인 상태 업데이트 (탭 전환 등)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        updateLoginButton();
    }
});

// 윈도우 포커스 시 로그인 상태 업데이트
window.addEventListener('focus', () => {
    updateLoginButton();
});

// 메시지 전송 기능 (API 연동)
sendMessageButton.addEventListener('click', async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    // 사용자 메시지 추가
    addUserMessage(message);
    chatInput.value = '';
    
    // 로딩 상태 표시
    const originalText = sendMessageButton.innerHTML;
    sendMessageButton.innerHTML = '<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>';
    sendMessageButton.disabled = true;

    try {
        // AI API 호출
        const result = await apiService.sendChatMessage(message);
        
        if (result.success) {
            // OpenAI API 응답에서 메시지 추출
            const aiResponse = result.data.choices?.[0]?.message?.content || 
                             result.data.response || 
                             result.data.message;
            addAIMessage(aiResponse);
        } else {
            // API 실패시 기본 응답
            addAIMessage(getAIResponse(message));
            showNotification('AI 서비스에 일시적인 문제가 있습니다. 기본 응답을 제공합니다.', 'warning');
        }
    } catch (error) {
        // 에러 발생시 기본 응답
        addAIMessage(getAIResponse(message));
        showNotification('네트워크 오류가 발생했습니다. 기본 응답을 제공합니다.', 'error');
    } finally {
        // 로딩 상태 해제
        sendMessageButton.innerHTML = originalText;
        sendMessageButton.disabled = false;
    }
});

// Enter 키로 메시지 전송
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessageButton.click();
    }
});

// 사용자 메시지 추가
function addUserMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex justify-end';
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#333333' : '#d2e0ff';
    const textColor = isDark ? '#ffffff' : '#000000';
    
    messageDiv.innerHTML = `
        <div class="chat-message-user rounded-2xl px-4 py-3 max-w-md" style="background-color: ${bgColor};">
            <p class="tilt-warp text-lg" style="font-size: 23px; color: ${textColor};">
                "${message}"
            </p>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// AI 메시지 추가
function addAIMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex justify-start';
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#333333' : '#d2e0ff';
    const textColor = isDark ? '#ffffff' : '#000000';
    
    messageDiv.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <span class="text-white font-bold text-lg">AI</span>
            </div>
            <div class="chat-message-ai rounded-2xl px-4 py-3 max-w-md" style="background-color: ${bgColor};">
                <p class="tilt-warp text-lg" style="font-size: 23px; color: ${textColor};">
                    ${message}
                </p>
            </div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 회원가입 화면 기능
const signupScreen = document.getElementById('signupScreen');
const backToMainFromSignupButton = document.getElementById('backToMainFromSignup');
const darkModeToggleSignup = document.getElementById('darkModeToggleSignup');
const signupSubmitButton = document.getElementById('signupSubmit');
const goToLoginButton = document.getElementById('goToLogin');

// 회원가입 버튼 클릭시 회원가입 화면 표시 (로그인 화면에서)
const signupLinkInLogin = document.querySelector('#loginScreen button[style*="color: #155dfc"]');
if (signupLinkInLogin) {
    signupLinkInLogin.addEventListener('click', () => {
        loginScreen.classList.add('hidden');
        signupScreen.classList.remove('hidden');
    });
}

// 뒤로가기 버튼 클릭시 메인 화면으로 돌아가기
backToMainFromSignupButton.addEventListener('click', () => {
    signupScreen.classList.add('hidden');
});

// 회원가입 다크모드 토글
darkModeToggleSignup.addEventListener('click', toggleDarkMode);

// 로그인으로 이동 버튼
goToLoginButton.addEventListener('click', () => {
    signupScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
});

// 회원가입 폼 제출 (백엔드 API 연동)
signupSubmitButton.addEventListener('click', async () => {
    const name = document.getElementById('signupName').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    console.log('회원가입 시도:', { name, username }); // 디버깅용
    
    // 유효성 검사
    if (!name || !username || !password) {
        showNotification('모든 필드를 입력해주세요.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('비밀번호는 6자 이상이어야 합니다.', 'error');
        return;
    }
    
    // 아이디 형식 검사 (영문, 숫자만 허용, 4-20자)
    const usernameRegex = /^[a-zA-Z0-9]{4,20}$/;
    if (!usernameRegex.test(username)) {
        showNotification('아이디는 영문, 숫자 조합 4-20자로 입력해주세요.', 'error');
        return;
    }

    // 버튼 비활성화
    signupSubmitButton.disabled = true;
    signupSubmitButton.textContent = '처리 중...';

    try {
        // 백엔드 API 호출
        const response = await fetch('http://localhost:8080/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, username, password })
        });

        const result = await response.json();
        console.log('회원가입 응답:', result); // 디버깅용

        if (result.success && result.data.success) {
            showNotification(`회원가입 성공! 환영합니다, ${name}님!`, 'success');
            signupScreen.classList.add('hidden');
            
            // 폼 초기화
            document.getElementById('signupName').value = '';
            document.getElementById('signupUsername').value = '';
            document.getElementById('signupPassword').value = '';
            
            // 자동으로 로그인 화면으로 이동
            setTimeout(() => {
                loginScreen.classList.remove('hidden');
            }, 1000);
        } else {
            const errorMessage = result.data?.message || '회원가입에 실패했습니다.';
            showNotification(errorMessage, 'error');
        }
    } catch (error) {
        console.error('회원가입 오류:', error);
        showNotification('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
        // 버튼 활성화
        signupSubmitButton.disabled = false;
        signupSubmitButton.textContent = '회원가입';
    }
});

// AI 응답 생성 (간단한 시뮬레이션)
function getAIResponse(userMessage) {
    const responses = {
        '롤': '롤(리그 오브 레전드)을 위한 PC 견적을 추천드릴게요!<br><br>💻 **추천 사양**<br>• CPU: AMD Ryzen 5 5600G<br>• GPU: GTX 1660 Super<br>• RAM: 16GB DDR4<br>• SSD: 500GB NVMe<br><br>💰 **예상 가격: 80만원**<br><br>이 사양으로 롤을 고화질로 원활하게 즐길 수 있습니다!',
        '게임': '게임용 PC 견적을 추천드릴게요!<br><br>🎮 **추천 사양**<br>• CPU: Intel i5-12400F<br>• GPU: RTX 3060<br>• RAM: 16GB DDR4<br>• SSD: 1TB NVMe<br><br>💰 **예상 가격: 120만원**<br><br>최신 게임들을 고화질로 즐길 수 있는 사양입니다!',
        '저가': '저가형 PC 견적을 추천드릴게요!<br><br>💡 **추천 사양**<br>• CPU: AMD Ryzen 3 3200G<br>• GPU: 내장 그래픽<br>• RAM: 8GB DDR4<br>• SSD: 250GB<br><br>💰 **예상 가격: 40만원**<br><br>일반적인 업무와 가벼운 게임에 적합합니다!',
        '고사양': '고사양 PC 견적을 추천드릴게요!<br><br>🚀 **추천 사양**<br>• CPU: Intel i7-13700K<br>• GPU: RTX 4070<br>• RAM: 32GB DDR5<br>• SSD: 2TB NVMe<br><br>💰 **예상 가격: 250만원**<br><br>최고급 게임과 작업에 최적화된 사양입니다!'
    };
    
    // 키워드 기반 응답
    for (const [keyword, response] of Object.entries(responses)) {
        if (userMessage.includes(keyword)) {
            return response;
        }
    }
    
    // 기본 응답
    return `"${userMessage}"에 대한 PC 견적을 분석하고 있습니다...<br><br>💻 **추천 사양**<br>• CPU: AMD Ryzen 5 5600X<br>• GPU: RTX 3060<br>• RAM: 16GB DDR4<br>• SSD: 500GB NVMe<br><br>💰 **예상 가격: 100만원**<br><br>더 구체적인 요구사항을 알려주시면 더 정확한 견적을 제공해드릴 수 있습니다!`;
}








