import React, { useEffect, useRef, useState } from 'react';
import apiService from './api/apiService.js';
import { API_CONFIG } from './config.js';

const initialUser = () => {
    const token = localStorage.getItem('userToken');
    const username = localStorage.getItem('userUsername');
    const name = localStorage.getItem('userName');
    if (token && username && name) return { token, username, name };
    return null;
};

export default function App() {
    const [isDark, setIsDark] = useState(() => localStorage.getItem('darkMode') === 'true');
    const [screen, setScreen] = useState('main');
    const [user, setUser] = useState(initialUser);

    const [searchText, setSearchText] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [signupName, setSignupName] = useState('');
    const [signupUsername, setSignupUsername] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupLoading, setSignupLoading] = useState(false);

    const [chatMessages, setChatMessages] = useState([]);
    const getOrCreateSessionId = () => {
        const key = 'chatSessionId';
        let v = localStorage.getItem(key);
        if (!v) {
            v = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
            try { localStorage.setItem(key, v); } catch (_) {}
        }
        return v;
    };
    const [sessionId] = useState(getOrCreateSessionId);
    const [chatInput, setChatInput] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        const html = document.documentElement;
        if (isDark) html.classList.add('dark'); else html.classList.remove('dark');
        try { localStorage.setItem('darkMode', String(isDark)); } catch (_) {}
    }, [isDark]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
    useEffect(() => {
        fetch('/api/auth/check', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (data.loggedIn) {
            const { username, name } = data.user;   // ← 둘 다 받기
            localStorage.setItem('userUsername', username);
            localStorage.setItem('userName', name);
            setUser({ username, name });
            } else {
            localStorage.removeItem('userUsername');
            localStorage.removeItem('userName');
            setUser(null);
        }
        })
        .catch(() => setUser(null));
    }, []);


    const showNotification = (message, type = 'info') => {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        const notification = document.createElement('div');
        notification.className = 'notification fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ' + (
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-black' :
            'bg-blue-500 text-white'
        );
        // 로그인 오버레이(z-index: 1000)보다 위에 표시
        notification.style.zIndex = '2001';
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
        setTimeout(() => notification.classList.remove('translate-x-full'), 100);
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('translate-x-full');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    };

    const handleLogout = async () => {
    try {
        // ✅ 서버에도 로그아웃 요청 (세션 무효화)
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include', // 세션 쿠키 포함
        });
    } catch (err) {
        console.warn('서버 로그아웃 요청 실패:', err);
    }

    // ✅ 클라이언트 상태 초기화
    localStorage.removeItem('userToken');
    localStorage.removeItem('userUsername');
    localStorage.removeItem('userName');
    setUser(null);
    showNotification('로그아웃되었습니다.', 'info');
};


  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
        showNotification('사용자명과 비밀번호를 입력해주세요.', 'error');
        return;
    }
    setLoginLoading(true);
    try {
        const result = await apiService.login(loginUsername, loginPassword);

        // ✅ 백엔드 응답 구조: { success:true, message:"로그인 성공", user:{id, username, name} }
        const data = result.data;

        if (result.success && data?.success) {
            const username = data.user.username;
            const name = data.user.name;

            // ✅ 세션 기반 로그인: 토큰 불필요
            localStorage.setItem('userUsername', username);
            localStorage.setItem('userName', name);
            setUser({ username, name });

            // ✅ 화면 전환 + 알림
            setScreen('main');
            setLoginUsername('');
            setLoginPassword('');
            showNotification(`로그인 성공! 환영합니다, ${name}님`, 'success');
        } else {
            showNotification(data?.message || '로그인에 실패했습니다.', 'error');
        }
    } catch (err) {
        showNotification('로그인 중 오류가 발생했습니다.', 'error');
    } finally {
        setLoginLoading(false);
    }
};


    const getFallbackAIResponse = (q) => `입력하신 요청("${q}")에 대한 기본 견적을 준비 중입니다.`;

    const handleSearch = async () => {
        const query = searchText.trim();
        if (!query) return;
        setIsSearching(true);
        setScreen('chat');
        setChatMessages([{ role: 'user', content: query }]);
        try {
            const result = await apiService.requestEstimate({ query }, sessionId);
            const aiResponse = result.success
                ? (result.data?.choices?.[0]?.message?.content || result.data?.estimate || result.data?.response || result.data?.message || (typeof result.data === 'string' ? result.data : JSON.stringify(result.data)))
                : null;
            setChatMessages((prev) => [...prev, { role: 'ai', content: aiResponse || getFallbackAIResponse(query) }]);
            if (!result.success) showNotification('견적 서비스에 일시적인 문제가 있습니다. 기본 응답을 제공합니다.', 'warning');
        } catch {
            setChatMessages((prev) => [...prev, { role: 'ai', content: getFallbackAIResponse(query) }]);
            showNotification('네트워크 오류가 발생했습니다. 기본 응답을 제공합니다.', 'error');
        } finally { setIsSearching(false); }
    };

    const handleSendChat = async () => {
        const message = chatInput.trim();
        if (!message) return;
        setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
        setChatInput('');
        setSending(true);
        try {
            const result = await apiService.sendChatMessage(message, sessionId);
            const aiResponse = result.success
                ? (result.data?.choices?.[0]?.message?.content || result.data?.response || result.data?.message)
                : null;
            setChatMessages((prev) => [...prev, { role: 'ai', content: aiResponse || '⚠️ AI 응답을 가져오지 못했습니다. 다시 시도해주세요.' }]);
            if (!result.success) showNotification('AI 서비스에 일시적인 문제가 있습니다. 기본 응답을 제공합니다.', 'warning');
        } catch {
            showNotification('네트워크 오류가 발생했습니다. 기본 응답을 제공합니다.', 'error');
            setChatMessages((prev) => [...prev, { role: 'ai', content: '⚠️ 네트워크 오류가 발생했습니다. 다시 시도해주세요.' }]);
        } finally { setSending(false); }
    };

    const handleSignup = async () => {
        if (!signupName || !signupUsername || !signupPassword) { showNotification('모든 필드를 입력해주세요.', 'error'); return; }
        if (signupPassword.length < 6) { showNotification('비밀번호는 6자 이상이어야 합니다.', 'error'); return; }
        if (!/^[a-zA-Z0-9]{4,20}$/.test(signupUsername)) { showNotification('아이디는 영문, 숫자 조합 4-20자로 입력해주세요.', 'error'); return; }
        setSignupLoading(true);
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: signupName, username: signupUsername, password: signupPassword }) });
            const result = await res.json();
            const duplicate =
                res.status === 409 ||
                /중복|duplicate|exists|이미/i.test(String(result?.message || result?.data?.message || ''));
            if (result.success && result.data?.success) {
                showNotification(`회원가입 성공! 환영합니다, ${signupName}님!`, 'success');
                setSignupName(''); setSignupUsername(''); setSignupPassword('');
                setScreen('login');
            } else if (duplicate) {
                showNotification('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.', 'error');
            } else { showNotification(result.data?.message || '회원가입에 실패했습니다.', 'error'); }
        } catch { showNotification('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error'); }
        finally { setSignupLoading(false); }
    };

    const renderAIMessage = (content) => {
        const dark = document.documentElement.classList.contains('dark');
        try {
            const data = typeof content === 'string' ? JSON.parse(content) : content;
            if (data && typeof data === 'object' && data.cpu && data.total_price) {
                const entries = Object.entries(data).filter(([k]) => k !== 'total_price');
                return (
                    <div className="tilt-warp" style={{ fontSize: 18, color: dark ? '#ffffff' : '#000000' }}>
                        <b>💻 견적 결과</b><br/><br/>
                        {entries.map(([key, item]) => (
                            <div key={key} style={{ marginBottom: 8 }}>
                                <b>{key.toUpperCase()}</b><br/>
                                {item?.name || '-'}<br/>
                                <span style={{ color: '#555' }}>{item?.price ? item.price.toLocaleString() + '원' : '-'}</span><br/>
                                {item?.link ? <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#1a73e8' }}>🔗 상품 보기</a> : null}
                                <hr style={{ border: 0, borderTop: '1px solid #ccc', margin: '8px 0' }} />
                            </div>
                        ))}
                        <b>💰 총합:</b> {data.total_price.toLocaleString()}원<br/>
                    </div>
                );
            }
        } catch {}
        return <>{content}</>;
    };

    const LoginLogoutButtons = () => (
        <div className="flex items-center space-x-4" style={{ marginRight: 40 }}>
            {!user ? (
                <button className="login-button tilt-warp px-6 py-2 rounded-lg hover:opacity-80" style={{ fontSize: 20 }} onClick={() => setScreen('login')}>로그인</button>
            ) : (
                <>
                    <button className="user-button tilt-warp px-6 py-2 rounded-lg hover:opacity-80" style={{ fontSize: 20 }} onClick={handleLogout}>{user.name}님</button>
                    <button id="logoutButton" className="tilt-warp px-4 py-2 rounded-lg hover:opacity-80" style={{ fontSize: 18, backgroundColor: '#dc3545', color: 'white', marginLeft: 10 }} onClick={handleLogout}>로그아웃</button>
                </>
            )}
            <div className="relative">
                <button className="toggle-button w-20 h-11 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }} onClick={() => setIsDark((v) => !v)}>
                    <div className="toggle-circle w-10 h-10 rounded-full shadow-md flex items-center justify-center" style={{ backgroundColor: 'var(--figma-white)' }}>
                        {!isDark ? (
                            <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        ) : (
                            <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );

    return (
        <div style={{ backgroundColor: 'var(--figma-white)' }}>
            <header className="figma-header" style={{ backgroundColor: 'var(--figma-white)', borderBottomColor: 'var(--figma-border)' }}>
                <div className="figma-container">
                    <div className="flex justify-between items-center h-full">
                        <div className="flex items-center" style={{ marginLeft: 40 }}>
                            <h1 className="tilt-warp text-4xl font-normal" style={{ fontSize: 36, color: 'var(--figma-black)' }}>PC Builder</h1>
                        </div>
                        <nav className="hidden md:flex items-center space-x-8">
                            <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>견적</a>
                            <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>제품</a>
                            <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>전문가 추천</a>
                        </nav>
                        <LoginLogoutButtons />
                    </div>
                </div>
            </header>

            {/* 모바일 전용 3분할 네비게이션 (md 이상에서는 헤더의 기존 네비 사용) */}
            <div className="md:hidden px-5 pt-4">
                <div className="md:flex md:space-x-4">
                    <a href="#" className="w-full mb-4 md:w-1/3 md:mb-0 block text-center py-3 rounded-lg" style={{ color: 'var(--figma-gray-500)', backgroundColor: 'var(--figma-gray-100)' }}>견적</a>
                    <a href="#" className="w-full mb-4 md:w-1/3 md:mb-0 block text-center py-3 rounded-lg" style={{ color: 'var(--figma-gray-500)', backgroundColor: 'var(--figma-gray-100)' }}>제품</a>
                    <a href="#" className="w-full md:w-1/3 block text-center py-3 rounded-lg" style={{ color: 'var(--figma-gray-500)', backgroundColor: 'var(--figma-gray-100)' }}>전문가 추천</a>
                </div>
            </div>

            {screen === 'main' && (
                <main className="min-h-screen" style={{ backgroundColor: 'var(--figma-white)' }}>
                    <div className="figma-container py-20">
                        <div className="text-center space-y-8">
                            <h2 className="tilt-warp hero-title font-normal leading-tight" style={{ fontSize: 70, color: 'var(--figma-black)', marginTop: 100 }}>어떤 PC가 필요하신가요?</h2>
                            <p className="tilt-warp hero-subtitle font-normal max-w-4xl mx-auto leading-relaxed" style={{ fontSize: 28, color: 'var(--figma-gray-600)' }}>AI와 함께 이야기 하며 맞춤형 컴퓨터 견적을 받아보세요</p>
                            <div className="max-w-2xl mx-auto mt-16">
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="flex-1 w-full">
                                        <div className="relative">
                                            <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="예: 롤이 잘 돌아가는 저가형 PC 추천해줘" className="tilt-neon w-full px-6 py-4 text-xl rounded-lg border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" style={{ backgroundColor: 'var(--figma-gray-100)', color: 'var(--figma-gray-700)', fontSize: 20, height: 62 }} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} />
                                        </div>
                                    </div>
                                    <button disabled={isSearching} onClick={handleSearch} className="tilt-neon px-8 py-4 rounded-lg hover:opacity-80 transition-opacity whitespace-nowrap" style={{ fontSize: 22, backgroundColor: 'var(--figma-black)', color: 'var(--figma-white)', height: 62 }}>{isSearching ? '분석 중...' : '질문하기'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {screen === 'login' && (
                <div className="fixed inset-0 bg-white dark:bg-gray-900" style={{ backgroundColor: 'var(--figma-white)', zIndex: 1000 }}>
                    <header className="figma-header" style={{ backgroundColor: 'var(--figma-white)', borderBottomColor: 'var(--figma-border)' }}>
                        <div className="figma-container">
                            <div className="flex justify-between items-center h-full">
                                <div className="flex items-center" style={{ marginLeft: 40 }}>
                                    <h1 className="tilt-warp text-4xl font-normal" style={{ fontSize: 36, color: 'var(--figma-black)' }}>PC Builder</h1>
                                </div>
                                <nav className="hidden md:flex items-center space-x-8">
                                    <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>견적</a>
                                    <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>제품</a>
                                    <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>전문가 추천</a>
                                </nav>
                                <LoginLogoutButtons />
                            </div>
                        </div>
                    </header>
                    <div className="flex items-center justify-center min-h-screen py-20">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-300 dark:border-gray-600" style={{ width: 558, height: 576, backgroundColor: 'var(--figma-white)', borderColor: '#d2d2d2' }}>
                            <div className="text-center space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="tilt-warp text-3xl font-normal" style={{ fontSize: 32, color: 'var(--figma-black)' }}>로그인</h2>
                                    <button className="tilt-warp text-lg hover:opacity-80" style={{ fontSize: 20, color: 'var(--figma-black)' }} onClick={() => setScreen('main')}>뒤로가기</button>
                                </div>
                                <p className="tilt-neon text-lg" style={{ fontSize: 18, color: '#9d9d9d' }}>계정에 로그인 하여 PC Builder를 이용하세요</p>
                                <div className="space-y-6 mt-8 text-left">
                                    <div>
                                        <label className="tilt-warp block text-lg mb-2" style={{ fontSize: 20, color: 'var(--figma-black)' }}>사용자명</label>
                                        <input type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="아이디를 입력하세요" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" style={{ backgroundColor: 'var(--figma-gray-100)', color: 'var(--figma-gray-700)', fontSize: 20 }} />
                                    </div>
                                    <div>
                                        <label className="tilt-warp block text-lg mb-2" style={{ fontSize: 20, color: 'var(--figma-black)' }}>비밀번호</label>
                                        <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="비밀번호를 입력하세요" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" style={{ backgroundColor: 'var(--figma-gray-100)', color: 'var(--figma-gray-700)', fontSize: 20 }} />
                                    </div>
                                    <button disabled={loginLoading} className="login-button w-full tilt-warp py-3 rounded-lg hover:opacity-80" style={{ fontSize: 20 }} onClick={handleLogin}>{loginLoading ? '처리 중...' : '로그인'}</button>
                                    <div className="text-center">
                                        <span className="tilt-warp text-lg" style={{ fontSize: 20, color: '#a1a1a1' }}>계정이 없으신가요? </span>
                                        <button className="tilt-warp text-lg hover:underline" style={{ fontSize: 20, color: '#155dfc' }} onClick={() => setScreen('signup')}>회원가입</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {screen === 'chat' && (
                <div className="bg-white dark:bg-gray-900" style={{ backgroundColor: 'var(--figma-white)', zIndex: 1000 }}>
                    <div className="flex items-center justify-center min-h-screen pt-4 pb-12">
                        <div className="w-full max-w-6xl mx-auto px-4">
                            <div className="text-center space-y-2 mb-4">
                                <h2 className="tilt-warp text-5xl font-normal" style={{ fontSize: 42, color: 'var(--figma-black)' }}>지금 바로 이용해보세요</h2>
                                <p className="tilt-warp text-2xl font-normal max-w-4xl mx-auto" style={{ fontSize: 20, color: 'var(--figma-gray-600)' }}>AI와 대화하거나 예산을 입력하여 맞춤형 PC견적을 받아보세요</p>
                            </div>
                            <div className="chatbot-container bg-gray-100 dark:bg-gray-800 rounded-3xl px-8 pt-8 pb-[2px] border border-gray-300 dark:border-gray-600" style={{ backgroundColor: 'var(--figma-gray-100)', borderColor: 'var(--figma-border)', borderRadius: 38, height: 820 }}>
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-300 dark:border-gray-600" style={{ borderBottomColor: 'var(--figma-border)' }}>
                                    <div className="flex items-center space-x-4">
                                        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center"><span className="text-white font-bold text-sm">AI</span></div>
                                        <div><h3 className="tilt-warp text-xl font-normal" style={{ fontSize: 21, color: 'var(--figma-black)' }}>견적 AI 지니</h3></div>
                                    </div>
                                    <button className="tilt-warp text-lg hover:opacity-80" style={{ fontSize: 21, color: 'var(--figma-black)' }} onClick={() => setScreen('main')}>뒤로가기</button>
                                </div>
                                <div className="space-y-4 mb-4 overflow-y-auto" style={{ height: 600 }}>
                                    {chatMessages.map((m, idx) => (
                                        <div key={idx} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                                            {m.role === 'user' ? (
                                                <div className="chat-message-user rounded-2xl px-2 py-1 max-w-[85%] md:max-w-[70%]" style={{ backgroundColor: isDark ? '#333333' : '#d2e0ff' }}>
                                                    <p className="tilt-warp text-lg" style={{ fontSize: 18, color: isDark ? '#ffffff' : '#000000' }}>
                                                        {m.content}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-start space-x-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"><span className="text-white font-bold text-sm">AI</span></div>
                                                    <div className="chat-message-ai rounded-2xl px-2 py-1 max-w-[85%] md:max-w-[70%]" style={{ backgroundColor: isDark ? '#333333' : '#d2e0ff', color: isDark ? '#ffffff' : '#000000' }}>
                                                        {renderAIMessage(m.content)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="flex-1">
                                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="메세지를 입력하세요." className="chat-input w-full px-3 py-2 h-10 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" style={{ backgroundColor: '#d9d9d9', color: '#717171', fontSize: 17, borderRadius: 10 }} onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }} />
                                    </div>
                                    <button disabled={sending} onClick={handleSendChat} className="bg-blue-500 hover:bg-blue-600 text-white rounded-md px-3 h-10 flex items-center justify-center transition-colors" style={{ backgroundColor: '#155dfc', borderRadius: 10 }}>
                                        {sending ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                        )}
                                    </button>
                                    <button title="저장" aria-label="저장" className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-md px-3 h-10 flex items-center justify-center transition-colors" onClick={() => { /* save later */ }}>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M12 16l4-5h-3V4h-2v7H8l4 5z"></path>
                                            <path d="M5 18h14v2H5z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {screen === 'signup' && (
                <div className="fixed inset-0 bg-white dark:bg-gray-900" style={{ backgroundColor: 'var(--figma-white)', zIndex: 1000 }}>
                    <header className="figma-header" style={{ backgroundColor: 'var(--figma-white)', borderBottomColor: 'var(--figma-border)' }}>
                        <div className="figma-container">
                            <div className="flex justify-between items-center h-full">
                                <div className="flex items-center" style={{ marginLeft: 40 }}>
                                    <h1 className="tilt-warp text-4xl font-normal" style={{ fontSize: 36, color: 'var(--figma-black)' }}>PC Builder</h1>
                                </div>
                                <nav className="hidden md:flex items-center space-x-8">
                                    <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>견적</a>
                                    <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>제품</a>
                                    <a href="#" className="tilt-warp nav-text font-normal" style={{ fontSize: 32, color: 'var(--figma-gray-500)' }}>전문가 추천</a>
                                </nav>
                                <LoginLogoutButtons />
                            </div>
                        </div>
                    </header>
                    <div className="flex items-center justify-center min-h-screen py-20">
                        <div className="signup-container bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-300 dark:border-gray-600" style={{ width: 558, height: 746, backgroundColor: 'var(--figma-white)', borderColor: '#d2d2d2', borderRadius: 30 }}>
                            <div className="text-center space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="tilt-warp text-3xl font-normal" style={{ fontSize: 32, color: 'var(--figma-black)' }}>회원가입</h2>
                                    <button className="tilt-warp text-lg hover:opacity-80" style={{ fontSize: 20, color: 'var(--figma-black)' }} onClick={() => setScreen('main')}>뒤로가기</button>
                                </div>
                                <p className="tilt-neon signup-subtitle text-lg" style={{ fontSize: 18, color: '#9d9d9d' }}>PC Builder 계정을 만들어 시작하세요.</p>
                                <div className="space-y-6 mt-8 text-left">
                                    <div>
                                        <label className="tilt-warp signup-label block text-lg mb-2" style={{ fontSize: 20, color: 'var(--figma-black)' }}>이름</label>
                                        <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="홍길동" className="signup-input w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" style={{ backgroundColor: 'var(--figma-gray-100)', color: 'var(--figma-gray-700)', fontSize: 20 }} />
                                    </div>
                                    <div>
                                        <label className="tilt-warp signup-label block text-lg mb-2" style={{ fontSize: 20, color: 'var(--figma-black)' }}>아이디</label>
                                        <input type="text" value={signupUsername} onChange={(e) => setSignupUsername(e.target.value)} placeholder="아이디를 입력하세요" className="signup-input w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" style={{ backgroundColor: 'var(--figma-gray-100)', color: 'var(--figma-gray-700)', fontSize: 20 }} />
                                    </div>
                                    <div>
                                        <label className="tilt-warp signup-label block text-lg mb-2" style={{ fontSize: 20, color: 'var(--figma-black)' }}>비밀번호</label>
                                        <input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="비밀번호를 입력하세요 (6자 이상)" className="signup-input w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent" style={{ backgroundColor: 'var(--figma-gray-100)', color: 'var(--figma-gray-700)', fontSize: 20 }} />
                                    </div>
                                    <button disabled={signupLoading} className="login-button w-full tilt-warp py-3 rounded-lg hover:opacity-80" style={{ fontSize: 20 }} onClick={handleSignup}>{signupLoading ? '처리 중...' : '회원가입'}</button>
                                    <div className="text-center">
                                        <span className="tilt-warp text-lg" style={{ fontSize: 20, color: '#a1a1a1' }}>이미 계정이 있으신가요? </span>
                                        <button className="tilt-warp text-lg hover:underline" style={{ fontSize: 20, color: '#155dfc' }} onClick={() => setScreen('login')}>로그인</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


