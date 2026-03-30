import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { portfolioApi } from '../api/portfolio';
import { indexApi } from '../api/index';
import type { PortfolioSummary, CustomIndexSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
    const [indexes, setIndexes] = useState<CustomIndexSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }

        Promise.all([
            portfolioApi.getMyPortfolios(),
            indexApi.getMyIndexes(),
        ]).then(([p, i]) => {
            setPortfolios(p);
            setIndexes(i);
        }).finally(() => setLoading(false));
    }, [isAuthenticated]);

    const handleProtectedAction = (path: string) => {
        if (!isAuthenticated) {
            alert('로그인이 필요한 기능입니다.');
            navigate('/login');
            return;
        }
        navigate(path);
    };

    const stats = [
        { label: '내 포트폴리오', value: isAuthenticated ? portfolios.length : 0, unit: '개', color: 'var(--accent)', icon: '▦' },
        { label: '내 지수', value: isAuthenticated ? indexes.length : 0, unit: '개', color: 'var(--accent2)', icon: '◉' },
        { label: '공개 포트폴리오', value: portfolios.filter(p => p.isPublic).length, unit: '개', color: 'var(--green)', icon: '⇄' },
        { label: '공개 지수', value: indexes.filter(i => i.isPublic).length, unit: '개', color: 'var(--amber)', icon: '◈' },
    ];

    return (
        <div>
            {/* 💡 상단 헤더 영역에 플렉스박스를 줘서 타이틀과 로그인 버튼을 양쪽에 배치합니다 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <PageHeader
                    title={isAuthenticated ? `안녕하세요, ${user?.name}님 👋` : '안녕하세요, 게스트님 👋'}
                    subtitle="오늘도 나만의 투자 전략을 만들어 보세요"
                />
                {/* 비로그인 상태일 때만 보여주는 로그인 버튼 */}
                {!isAuthenticated && (
                    <Button onClick={() => navigate('/login')}>
                        로그인하기
                    </Button>
                )}
            </div>

            <div className={styles.statsGrid}>
                {stats.map((s) => (
                    <Card key={s.label} className={styles.statCard}>
                        <div className={styles.statIcon} style={{ color: s.color }}>{s.icon}</div>
                        <div className={styles.statValue} style={{ color: s.color }}>
                            {loading ? '—' : s.value}<span className={styles.statUnit}>{s.unit}</span>
                        </div>
                        <div className={styles.statLabel}>{s.label}</div>
                    </Card>
                ))}
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>빠른 시작</h2>
                <div className={styles.actionGrid}>
                    <div className={styles.actionCard} onClick={() => handleProtectedAction('/portfolios/new')}>
                        <span className={styles.actionIcon}>▦</span>
                        <div>
                            <div className={styles.actionTitle}>포트폴리오 만들기</div>
                            <div className={styles.actionDesc}>원하는 종목으로 나만의 포트폴리오 구성</div>
                        </div>
                    </div>
                    <div className={styles.actionCard} onClick={() => handleProtectedAction('/indexes/new')}>
                        <span className={styles.actionIcon}>◉</span>
                        <div>
                            <div className={styles.actionTitle}>나만의 지수 만들기</div>
                            <div className={styles.actionDesc}>금리·환율·유가 등으로 커스텀 경제지수 설계</div>
                        </div>
                    </div>
                    <div className={styles.actionCard} onClick={() => handleProtectedAction('/portfolios/compare')}>
                        <span className={styles.actionIcon}>⇄</span>
                        <div>
                            <div className={styles.actionTitle}>포트폴리오 비교</div>
                            <div className={styles.actionDesc}>다른 투자자와 포트폴리오 기간별 비교</div>
                        </div>
                    </div>
                    <div className={styles.actionCard} onClick={() => navigate('/indexes')}>
                        <span className={styles.actionIcon}>◈</span>
                        <div>
                            <div className={styles.actionTitle}>공개 지수 탐색</div>
                            <div className={styles.actionDesc}>다른 사람이 공개한 지수를 확인하고 분석</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.columns}>
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>최근 포트폴리오</h2>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/portfolios')}>전체 보기 →</Button>
                    </div>
                    {!isAuthenticated ? (
                        <Card className={styles.empty}>
                            <p>로그인하고 나만의 포트폴리오를 만들어보세요!</p>
                        </Card>
                    ) : loading ? <div className={styles.empty}><div className="spinner" /></div> :
                        portfolios.length === 0 ? (
                            <div className={styles.empty}>아직 포트폴리오가 없습니다</div>
                        ) : portfolios.slice(0, 4).map((p) => (
                            <Card key={p.id} hoverable className={styles.listCard} onClick={() => navigate(`/portfolios/${p.id}`)}>
                                <div className={styles.listCardHeader}>
                                    <span className={styles.listCardTitle}>{p.name}</span>
                                    <span className={styles.badge}>{p.isPublic ? '공개' : '비공개'}</span>
                                </div>
                                <div className={styles.listCardMeta}>{p.itemCount}개 종목</div>
                            </Card>
                        ))
                    }
                </div>

                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>최근 지수</h2>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/indexes')}>전체 보기 →</Button>
                    </div>
                    {!isAuthenticated ? (
                        <Card className={styles.empty}>
                            <p>로그인하고 나만의 지수를 만들어보세요!</p>
                        </Card>
                    ) : loading ? <div className={styles.empty}><div className="spinner" /></div> :
                        indexes.length === 0 ? (
                            <div className={styles.empty}>아직 지수가 없습니다</div>
                        ) : indexes.slice(0, 4).map((i) => (
                            <Card key={i.id} hoverable className={styles.listCard} onClick={() => navigate(`/indexes/${i.id}`)}>
                                <div className={styles.listCardHeader}>
                                    <span className={styles.listCardTitle}>{i.name}</span>
                                    <span className={styles.badge}>{i.isPublic ? '공개' : '비공개'}</span>
                                </div>
                                <div className={styles.listCardMeta}>{i.componentCount}개 지표</div>
                            </Card>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}