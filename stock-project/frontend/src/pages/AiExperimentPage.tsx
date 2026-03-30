import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
    RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { portfolioApi } from '../api/portfolio';
import { indexApi } from '../api/index';
import type { PortfolioSummary, CustomIndexSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import styles from './AiExperimentPage.module.css';

// 💡 Mock 데이터와 Mock API를 정의합니다.
// 실제 AI API가 준비되면 이 부분을 교체하면 됩니다.
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const MOCK_PERFORMANCE_DATA = [
    { period: "1개월", portfolio: -1.2, kospi: -0.5, index: 2.1 },
    { period: "3개월", portfolio: 4.8, kospi: 1.8, index: 8.5 },
    { period: "6개월", portfolio: 9.5, kospi: 5.2, index: 15.2 },
    { period: "7개월", portfolio: 12.0, kospi: 6.0, index: 18.0 },
    { period: "1년", portfolio: 21.4, kospi: 8.9, index: 35.0 }
];

const MOCK_RADAR_DATA = [
    { subject: "Tech 성장성", portfolio: 85, index_avg: 70 },
    { subject: "이자율 영향력", portfolio: 60, index_avg: 65 },
    { subject: "환율 민감도", portfolio: 75, index_avg: 70 },
    { subject: "유가 변동성", portfolio: 50, index_avg: 60 },
    { subject: "소비자 물가", portfolio: 65, index_avg: 68 }
];

const getMockExperimentResults = (portfolioId: number, indexIds: number[]) => {
    // 💡 선택된 portfolioId와 indexIds를 사용하여 실제 AI 서버에 요청을 보냅니다.
    // 지금은 Mock 데이터를 반환합니다.
    return {
        id: Date.now(),
        portfolioId,
        indexIds,
        expectedReturn: 55, // Mock 예상 수익률
        maxDrawdown: -3.7, // Mock 최대 낙폭
        optimizationScore: 3.34, // Mock 최적화 점수
        performanceChart: MOCK_PERFORMANCE_DATA,
        radarChart: MOCK_RADAR_DATA,
        recommendation: "포트폴리오 비중 조정 권장: Tech 섹터 +5%, 에너지 섹터 -3%"
    };
};

export default function AiExperimentPage() {
    const navigate = useNavigate();
    const [myPortfolios, setMyPortfolios] = useState<PortfolioSummary[]>([]);
    const [myIndexes, setMyIndexes] = useState<CustomIndexSummary[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
    const [selectedIndexIds, setSelectedIndexIds] = useState<number[]>([]);
    const [experimentResult, setExperimentResult] = useState<any>(null); // 💡 Mock 결과 저장
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // 💡 내 포트폴리오와 내 지수 목록을 가져옵니다.
        Promise.all([
            portfolioApi.getMyPortfolios(),
            indexApi.getMyIndexes(),
        ]).then(([p, i]) => {
            setMyPortfolios(p);
            setMyIndexes(i);
        });
    }, []);

    // 💡 실험 시작 버튼 클릭 시 작동
    const handleRunExperiment = async () => {
        if (!selectedPortfolioId) return alert('포트폴리오를 선택하세요');
        if (selectedIndexIds.length === 0) return alert('최소 1개의 지수를 선택하세요');
        setLoading(true);
        // 💡 실제로는 이 곳에서 AI 서버 API를 호출합니다.
        setTimeout(() => {
            const result = getMockExperimentResults(selectedPortfolioId, selectedIndexIds);
            setExperimentResult(result);
            setLoading(false);
        }, 1500); // 💡 Mock 데이터 로딩 시뮬레이션
    };

    const isRunExperimentDisabled = !selectedPortfolioId || selectedIndexIds.length === 0 || loading;

    return (
        <div>
            <PageHeader
                title="AI & 빅데이터 실험"
                subtitle="나만의 지수와 포트폴리오를 활용하여 AI 기반의 투자 전략을 설계하고 시뮬레이션하세요."
            />

            <div className={styles.layout}>
                {/* 1️⃣ 왼쪽: 포트폴리오 & 지수 선택 패널 */}
                <Card className={styles.selectorCard}>
                    <div className={styles.selectorTitle}>실험 포트폴리오 & 지수 선택 <span className={styles.badge}>{selectedPortfolioId ? 1 : 0}/1</span> <span className={styles.badge}>{selectedIndexIds.length}/3</span></div>
                    <div className={styles.list}>
                        {/* 내 포트폴리오 section (radio button style) */}
                        <div className={styles.sectionHeader}>내 포트폴리오</div>
                        {myPortfolios.map((p) => (
                            <div
                                key={p.id}
                                className={`${styles.listItem} ${selectedPortfolioId === p.id ? styles.listItemSelected : ''}`}
                                onClick={() => setSelectedPortfolioId(p.id)}
                            >
                                <div className={`${styles.listItemRadio} ${selectedPortfolioId === p.id ? styles.listItemRadioSelected : ''}`}>
                                    {selectedPortfolioId === p.id && <div className={styles.radioThumb} />}
                                </div>
                                <div className={styles.listItemInfo}>
                                    <div className={styles.listItemName}>{p.name}</div>
                                    <div className={styles.listItemMeta}>{p.itemCount}개 종목</div>
                                </div>
                            </div>
                        ))}
                        <div className={styles.divider} />
                        {/* 내 지수 section (checkbox style) */}
                        <div className={styles.sectionHeader}>내 지수</div>
                        {myIndexes.map((i) => (
                            <div
                                key={i.id}
                                className={`${styles.listItem} ${selectedIndexIds.includes(i.id) ? styles.listItemSelected : ''}`}
                                onClick={() =>
                                    setSelectedIndexIds((prev) =>
                                        prev.includes(i.id) ? prev.filter((x) => x !== i.id) : prev.length < 3 ? [...prev, i.id] : prev
                                    )
                                }
                            >
                                <div className={styles.listItemCheck}>{selectedIndexIds.includes(i.id) ? '✓' : ''}</div>
                                <div className={styles.listItemInfo}>
                                    <div className={styles.listItemName}>{i.name}</div>
                                    <div className={styles.listItemMeta}>{i.componentCount}개 지표</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button
                        onClick={handleRunExperiment}
                        disabled={isRunExperimentDisabled}
                        loading={loading}
                        style={{ width: '100%', marginTop: '16px' }}
                    >
                        실험 시작
                    </Button>
                </Card>

                {/* 2️⃣ 오른쪽: 실험 결과 패널 */}
                <div className={styles.charts}>
                    {/* 실험 시작 전 placeholder */}
                    {!experimentResult ? (
                        <div className={styles.placeholder}>
                            <div className={styles.placeholderIcon}>🤖</div>
                            <div className={styles.placeholderText}>포트폴리오와 지수를 선택하고 실험 시작을 눌러주세요.</div>
                        </div>
                    ) : (
                        // 💡 실험 완료 후 Mock 결과 표시
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 💡 Mock 결과 개요 카드 */}
                            <Card style={{ backgroundColor: '#1e293b' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <h3 className={styles.chartTitle} style={{ margin: 0 }}>AI 시뮬레이션 결과 (Mock Data)</h3>
                                    <span className={styles.badge} style={{ backgroundColor: 'var(--green)', border: 'none', color: '#fff' }}>Coming Soon</span>
                                </div>
                                <div className={styles.summaryGrid}>
                                    <div className={styles.summaryItem}><div className={styles.summaryLabel}>예상 수익률 (Mock)</div><div className={styles.summaryValue} style={{ color: 'var(--green)' }}>+{experimentResult.expectedReturn}%</div></div>
                                    <div className={styles.summaryItem}><div className={styles.summaryLabel}>최대 낙폭 (Mock)</div><div className={styles.summaryValue} style={{ color: 'var(--amber)' }}>{experimentResult.maxDrawdown}%</div></div>
                                    <div className={styles.summaryItem}><div className={styles.summaryLabel}>최적화 점수 (Mock)</div><div className={styles.summaryValue} style={{ color: 'var(--green)' }}>{experimentResult.optimizationScore}</div></div>
                                </div>
                            </Card>

                            {/* 💡 Mock 퍼포먼스 차트 카드 */}
                            <Card>
                                <h3 className={styles.chartTitle}>시뮬레이션 퍼포먼스 차트 (Mock)</h3>
                                <ResponsiveContainer width="100%" height={350}>
                                    <LineChart data={experimentResult.performanceChart} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3a52" vertical={false} />
                                        <XAxis dataKey="period" stroke="#8b9eb7" />
                                        <YAxis tickFormatter={(val) => `${val}%`} stroke="#8b9eb7" />
                                        <Tooltip formatter={(val: number) => `${val}%`} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="kospi" name="벤치마크 (KOSPI)" stroke="#8b9eb7" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="portfolio" name="시뮬레이션 포트폴리오 (Mock)" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                                        <Line type="monotone" dataKey="index" name="선택된 지수 (MoneyChasing AI Index)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                {/* 💡 Mock 최적화 제안 카드 */}
                                <Card>
                                    <h3 className={styles.chartTitle}>AI 최적화 제안 (Mock)</h3>
                                    <div style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.6' }}>
                                        <p>포트폴리오 비중 조정 권장: Tech 섹터 +5%, 에너지 섹터 -3%</p>
                                        <p>선택된 Tech Index와의 높은 상관관계 분석.</p>
                                        <p>포트폴리오 비중 조정 권장: 장기 분석.</p>
                                    </div>
                                </Card>

                                {/* 💡 Mock 지수-포트폴리오 연계 분석 Radar 차트 카드 */}
                                <Card>
                                    <h3 className={styles.chartTitle}>지수-포트폴리오 연계 분석 (Mock)</h3>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={experimentResult.radarChart}>
                                            <PolarGrid stroke="#2a3a52" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b9eb7', fontSize: 13, fontWeight: 600 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                            <Legend />
                                            <Radar name="선택된 포트폴리오" dataKey="portfolio" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                                            <Radar name="선택된 지수 (평균)" dataKey="index_avg" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}