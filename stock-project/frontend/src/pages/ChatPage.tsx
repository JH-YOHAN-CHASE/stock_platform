import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import './ChatPage.css';

interface ChatMessage {
    id?: number;
    userId: number;
    username: string;
    content: string;
    referencedPortfolioId?: number | null;
    referencedPortfolioName?: string | null;
    referencedIndexId?: number | null;
    referencedIndexName?: string | null;
    createdAt?: string;
}

interface AttachedItem {
    id: number;
    name: string;
}

const ChatPage: React.FC = () => {
    const [currentUser] = useState({ userId: 1024, username: "채팅 실험이에유" });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');

    const [attachedPortfolio, setAttachedPortfolio] = useState<AttachedItem | null>(null);
    const [attachedIndex, setAttachedIndex] = useState<AttachedItem | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
    const [isIndexModalOpen, setIsIndexModalOpen] = useState(false);
    const [portfolioList, setPortfolioList] = useState<any[]>([]);
    const [indexList, setIndexList] = useState<any[]>([]);

    const stompClientRef = useRef<Client | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 과거 대화 내역 조회 (안정성 강화)
        fetch('/api/chat/history')
            .then(res => res.ok ? res.json() : null)
            .then((resData) => {
                // ApiResponse 포맷 및 일반 배열 포맷 둘 다 안전하게 검사합니다.
                let list = resData && resData.data ? resData.data : (Array.isArray(resData) ? resData : []);

                if (Array.isArray(list)) {
                    // 데이터가 유실되지 않도록 정렬 순서를 맞춥니다.
                    setMessages([...list].reverse());
                }
            })
            .catch(err => console.error("과거 대화 내역 조회 실패:", err));

        // 웹소켓 연결
        const client = new Client({
            brokerURL: 'ws://localhost:8083/ws-chat',
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            setIsConnected(true);
            client.subscribe('/topic/public', (message) => {
                const receivedMessage: ChatMessage = JSON.parse(message.body);
                setMessages(prev => [...prev, receivedMessage]);
            });
        };

        client.onStompError = () => setIsConnected(false);
        client.onWebSocketClose = () => setIsConnected(false);

        client.activate();
        stompClientRef.current = client;

        return () => { client.deactivate() };
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && !attachedPortfolio && !attachedIndex) return;
        if (!stompClientRef.current || !isConnected) {
            alert("서버와 연결이 원활하지 않습니다.");
            return;
        }

        const chatRequestDto: ChatMessage = {
            userId: currentUser.userId,
            username: currentUser.username,
            content: input,
            referencedPortfolioId: attachedPortfolio ? attachedPortfolio.id : null,
            referencedPortfolioName: attachedPortfolio ? attachedPortfolio.name : null,
            referencedIndexId: attachedIndex ? attachedIndex.id : null,
            referencedIndexName: attachedIndex ? attachedIndex.name : null
        };

        stompClientRef.current.publish({
            destination: '/app/chat.sendMessage',
            body: JSON.stringify(chatRequestDto)
        });

        setInput('');
        setAttachedPortfolio(null);
        setAttachedIndex(null);
    };

    const openPortfolioModal = async () => {
        try {
            const res = await fetch('/api/portfolios/public');
            const resData = await res.json();
            const list = resData && resData.data ? resData.data : [];
            setPortfolioList(list);
            setIsPortfolioModalOpen(true);
        } catch (e) {
            console.error(e);
            alert("포트폴리오 목록을 불러오지 못했습니다.");
        }
    };

    const openIndexModal = async () => {
        try {
            const res = await fetch('/api/indexes/public');
            const resData = await res.json();
            const list = resData && resData.data ? resData.data : [];
            setIndexList(list);
            setIsIndexModalOpen(true);
        } catch (e) {
            console.error(e);
            alert("지수 목록을 불러오지 못했습니다.");
        }
    };

    const selectPortfolio = (item: any) => {
        setAttachedPortfolio({ id: item.id, name: item.name || item.title });
        setAttachedIndex(null);
        setIsPortfolioModalOpen(false);
    };

    const selectIndex = (item: any) => {
        setAttachedIndex({ id: item.id, name: item.name || item.title });
        setAttachedPortfolio(null);
        setIsIndexModalOpen(false);
    };

    return (
        <div className="chat-page-container">
            <div className="chat-page-header">
                <div className="header-title-row">
                    <h2>Money Chasing 소셜 트레이딩 허브</h2>
                    <span className={`status-indicator ${isConnected ? 'on' : 'off'}`}>
                        {isConnected ? 'LIVE 연결됨' : '연결 끊김'}
                    </span>
                </div>
                <p>다른 투자자들의 공개 포트폴리오와 경제 지표 모델을 실시간으로 확인하고 토론하세요.</p>
            </div>

            <div className="chat-messages-display-zone">
                {messages.map((msg, index) => (
                    <div key={msg.id || index} className={`message-bubble-wrapper ${msg.userId === currentUser.userId ? 'my-message' : 'other-message'}`}>
                        <div className="message-meta-info">
                            <span className="user-nickname">{msg.username}</span>
                            {msg.createdAt && <span className="send-timestamp">{new Date(msg.createdAt).toLocaleTimeString()}</span>}
                        </div>

                        <div className="message-bubble-body">
                            {msg.content && <p className="main-text-content">{msg.content}</p>}

                            {/* 💡 꿀팁 반영: window.open을 사용하여 새 탭에서 조회하도록 유도, 채팅 유지 */}
                            {msg.referencedPortfolioId && (
                                <div className="embedded-shared-card" onClick={() => window.open(`/portfolios/${msg.referencedPortfolioId}`, '_blank')}>
                                    <div className="embedded-card-icon">💼</div>
                                    <div className="embedded-card-text-details">
                                        <span className="badge-type">공유 포트폴리오</span>
                                        <h4>{msg.referencedPortfolioName}</h4>
                                    </div>
                                </div>
                            )}

                            {msg.referencedIndexId && (
                                <div className="embedded-shared-card" onClick={() => window.open(`/indexes/${msg.referencedIndexId}`, '_blank')}>
                                    <div className="embedded-card-icon">📈</div>
                                    <div className="embedded-card-text-details">
                                        <span className="badge-type">공유 지수 시나리오</span>
                                        <h4>{msg.referencedIndexName}</h4>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-interactive-input-form">
                {(attachedPortfolio || attachedIndex) && (
                    <div className="live-attachment-preview-bar">
                        <span className="preview-label">📌 링크 전송 대기중: <strong>{attachedPortfolio?.name || attachedIndex?.name}</strong></span>
                        <button type="button" className="clear-attach-btn" onClick={() => { setAttachedPortfolio(null); setAttachedIndex(null); }}>취소</button>
                    </div>
                )}

                <div className="utility-action-button-row">
                    <button type="button" className="attachment-trigger-btn" onClick={openPortfolioModal}>
                        💼 공개 포트폴리오 첨부
                    </button>
                    <button type="button" className="attachment-trigger-btn" onClick={openIndexModal}>
                        📈 공개 지수 첨부
                    </button>
                </div>

                <div className="text-input-submit-row">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isConnected ? "메시지를 입력하고 공유하세요..." : "연결 중입니다..."}
                        disabled={!isConnected}
                    />
                    <button type="submit" className="message-submit-action-btn" disabled={!isConnected}>
                        보내기
                    </button>
                </div>
            </form>

            {/* 포트폴리오 선택 모달 */}
            {isPortfolioModalOpen && (
                <div className="selection-modal-overlay" onClick={() => setIsPortfolioModalOpen(false)}>
                    <div className="selection-modal-content" onClick={e => e.stopPropagation()}>
                        <h3>공개 포트폴리오 선택</h3>
                        <div className="selection-list">
                            {portfolioList.length > 0 ? portfolioList.map(item => (
                                <div key={item.id} className="selection-item" onClick={() => selectPortfolio(item)}>
                                    <span className="item-icon">💼</span>
                                    <span className="item-name">{item.name || item.title}</span>
                                </div>
                            )) : <p className="empty-message">공개된 포트폴리오가 없습니다.</p>}
                        </div>
                        <button className="modal-close-btn" onClick={() => setIsPortfolioModalOpen(false)}>닫기</button>
                    </div>
                </div>
            )}

            {/* 지수 선택 모달 */}
            {isIndexModalOpen && (
                <div className="selection-modal-overlay" onClick={() => setIsIndexModalOpen(false)}>
                    <div className="selection-modal-content" onClick={e => e.stopPropagation()}>
                        <h3>공개 지수 선택</h3>
                        <div className="selection-list">
                            {indexList.length > 0 ? indexList.map(item => (
                                <div key={item.id} className="selection-item" onClick={() => selectIndex(item)}>
                                    <span className="item-icon">📈</span>
                                    <span className="item-name">{item.name || item.title}</span>
                                </div>
                            )) : <p className="empty-message">공개된 지수가 없습니다.</p>}
                        </div>
                        <button className="modal-close-btn" onClick={() => setIsIndexModalOpen(false)}>닫기</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatPage;