import { useEffect, useState } from 'react';
import {
    LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
    RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { portfolioApi } from '../api/portfolio';
import { indexApi } from '../api/index';
import { aiApi } from '../api/ai';
import type { PortfolioSummary, CustomIndexSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import styles from './AiExperimentPage.module.css';

export default function AiExperimentPage() {
    const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
    const [indexes, setIndexes] = useState<CustomIndexSummary[]>([]);

    const [selectedPId, setSelectedPId] = useState<number | null>(null);
    const [selectedIId, setSelectedIId] = useState<number | null>(null);

    // 타입을 any로 임시 지정하여 타입 에러를 우회합니다.
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Promise.all([
            portfolioApi.getMyPortfolios().catch(() => []),
            indexApi.getMyIndexes().catch(() => [])
        ]).then(([p, i]) => {
            setPortfolios(p || []);
            setIndexes(i || []);
        });
    }, []);

    const handleRunExperiment = async () => {
        if (!selectedPId || !selectedIId) return;

        setLoading(true);
        setResult(null);

        try {
            const data = await aiApi.runAiSimulation(selectedPId, selectedIId);
            // 💡 브라우저 콘솔에서 실제 데이터 구조를 확인해 보세요!
            console.log("서버 응답 데이터:", data);
            setResult(data || {}); // data가 없어도 빈 객체를 넣어 에러 방지
        } catch (error) {
            console.error("Simulation Error:", error);
            alert("AI 시뮬레이션 서버와 통신 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 💡 [핵심 방어 코드] 렌더링 중에 에러가 나지 않도록 사전에 안전하게 값을 추출합니다.
    const isSuccess = !!result;
    const perfReturn = result?.performance?.return || 0;
    const perfDrawdown = result?.performance?.drawdown || 0;
    const perfScore = result?.performance?.score || 0;
    const simulationChartData = result?.simulationChart || [];
    const radarChartData = result?.radarChart || [];
    const recommendationText = result?.recommendation || "분석 결과가 제공되지 않았습니다. (서버 응답 확인 필요)";

    return (
        <div style={{ padding: '20px' }}>
            <PageHeader title="AI 지수 결합 실험실" subtitle="나만의 지수와 포트폴리오를 결합하여 미래 성과를 예측합니다." />

            <div className={styles.layout}>
                {/* ─── 왼쪽: 사이드바 (조건 설정) ─── */}
                <div className={styles.selectorCard}>
                    <Card>
                        <div className={styles.selectorTitle}>
                            실험 설정 <span className={styles.badge}>Beta</span>
                        </div>

                        <div className={styles.sectionHeader}>1. 포트폴리오 선택</div>
                        <div className={styles.list}>
                            {portfolios.map(p => (
                                <div
                                    key={p.id}
                                    className={`${styles.listItem} ${selectedPId === p.id ? styles.listItemSelected : ''}`}
                                    onClick={() => setSelectedPId(p.id)}
                                >
                                    <div className={`${styles.listItemRadio} ${selectedPId === p.id ? styles.listItemRadioSelected : ''}`}>
                                        {selectedPId === p.id && <div className={styles.radioThumb} />}
                                    </div>
                                    <div>
                                        <div className={styles.listItemName}>{p.name}</div>
                                        <div className={styles.listItemMeta}>종목 {p.itemCount}개</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.divider} />

                        <div className={styles.sectionHeader}>2. 결합 지수 선택</div>
                        <div className={styles.list}>
                            {indexes.map(idx => (
                                <div
                                    key={idx.id}
                                    className={`${styles.listItem} ${selectedIId === idx.id ? styles.listItemSelected : ''}`}
                                    onClick={() => setSelectedIId(idx.id)}
                                >
                                    <div className={`${styles.listItemRadio} ${selectedIId === idx.id ? styles.listItemRadioSelected : ''}`}>
                                        {selectedIId === idx.id && <div className={styles.radioThumb} />}
                                    </div>
                                    <div>
                                        <div className={styles.listItemName}>{idx.name}</div>
                                        <div className={styles.listItemMeta}>지표 {idx.componentCount}개</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            style={{ width: '100%', marginTop: '20px' }}
                            onClick={handleRunExperiment}
                            loading={loading}
                            disabled={!selectedPId || !selectedIId}
                        >
                            시뮬레이션 실행
                        </Button>
                    </Card>
                </div>

                {/* ─── 오른쪽: 분석 결과 대시보드 ─── */}
                <div>
                    {isSuccess ? (
                        <div>
                            {/* 상단 요약 3칸 */}
                            <div className={styles.summaryGrid} style={{ marginBottom: '24px' }}>
                                <Card>
                                    <div className={styles.summaryItem}>
                                        <div className={styles.summaryLabel}>예상 수익률 (12M)</div>
                                        <div className={styles.summaryValue} style={{ color: '#3b82f6' }}>
                                            {perfReturn > 0 ? '+' : ''}{perfReturn}%
                                        </div>
                                    </div>
                                </Card>
                                <Card>
                                    <div className={styles.summaryItem}>
                                        <div className={styles.summaryLabel}>최대 낙폭 (MDD)</div>
                                        <div className={styles.summaryValue} style={{ color: '#ef4444' }}>
                                            {perfDrawdown}%
                                        </div>
                                    </div>
                                </Card>
                                <Card>
                                    <div className={styles.summaryItem}>
                                        <div className={styles.summaryLabel}>AI 스코어</div>
                                        <div className={styles.summaryValue}>
                                            {perfScore} / 10
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* 메인 라인 차트 */}
                            <Card title="미래 성과 시뮬레이션 (3개월 ~ 1년)">
                                <div style={{ width: '100%', height: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={simulationChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3a52" />
                                            <XAxis dataKey="period" stroke="#8b9eb7" />
                                            <YAxis unit="%" stroke="#8b9eb7" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                            <Legend />
                                            <Line type="monotone" dataKey="value" name="예상 수익률" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* 하단 리포트 및 레이더 차트 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                                <Card title="AI 분석 리포트">
                                    <div style={{ color: 'var(--text2)', lineHeight: 1.6, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                        {recommendationText}
                                    </div>
                                </Card>

                                <Card title="지표 민감도 분석">
                                    <div style={{ width: '100%', height: 280 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={radarChartData}>
                                                <PolarGrid stroke="#2a3a52" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b9eb7', fontSize: 12 }} />
                                                <Tooltip />
                                                <Radar name="내 포트폴리오" dataKey="portfolio" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                                                <Radar name="지수 평균" dataKey="index_avg" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.placeholder}>
                            <div className={styles.placeholderIcon}>{loading ? "⚙️" : "🔬"}</div>
                            <p className={styles.placeholderText}>
                                {loading ? "AI가 데이터를 분석하여 시나리오를 생성 중입니다..." : "분석할 포트폴리오와 지수를 왼쪽에서 선택해 주세요."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}