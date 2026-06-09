import { useEffect, useState } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { portfolioApi } from '../api/portfolio';
import { indexApi } from '../api/index';
import { aiApi } from '../api/ai';
import type { PortfolioSummary, CustomIndexSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import styles from './AiExperimentPage.module.css';

// ---------------------------------------------------------------------------
// 1. 타입 정의 (any 제거)
// ---------------------------------------------------------------------------
interface GroupedItem {
    id: number;
    name: string;
    count: number;
    group: '내 포트폴리오' | '내 지수' | '공개';
}

interface AiSimulationResult {
    performance?: { return: number; drawdown: number; score: number };
    simulationChart?: { period: string; value: number }[];
    radarChart?: { subject: string; portfolio: number; index_avg: number }[];
    recommendation?: string;
}

// ---------------------------------------------------------------------------
// 2. 메인 페이지 컴포넌트
// ---------------------------------------------------------------------------
export default function AiExperimentPage() {
    const [portfolios, setPortfolios] = useState<GroupedItem[]>([]);
    const [indexes, setIndexes] = useState<GroupedItem[]>([]);

    const [selectedPId, setSelectedPId] = useState<number | null>(null);
    const [selectedIId, setSelectedIId] = useState<number | null>(null);

    const [result, setResult] = useState<AiSimulationResult | null>(null);
    const [loading, setLoading] = useState(false);

    // 데이터 패칭 로직
    useEffect(() => {
        Promise.all([
            portfolioApi.getMyPortfolios().catch(() => []),
            portfolioApi.getPublicPortfolios().catch(() => []),
            indexApi.getMyIndexes().catch(() => []),
            indexApi.getPublicIndexes().catch(() => []),
        ]).then(([myP, pubP, myI, pubI]) => {
            setPortfolios([
                ...myP.map(p => ({ id: p.id, name: p.name, count: p.itemCount, group: '내 포트폴리오' as const })),
                ...pubP.filter(p => !myP.some(m => m.id === p.id))
                    .map(p => ({ id: p.id, name: p.name, count: p.itemCount, group: '공개' as const })),
            ]);
            setIndexes([
                ...myI.map(i => ({ id: i.id, name: i.name, count: i.componentCount, group: '내 지수' as const })),
                ...pubI.filter(i => !myI.some(m => m.id === i.id))
                    .map(i => ({ id: i.id, name: i.name, count: i.componentCount, group: '공개' as const })),
            ]);
        });
    }, []);

    // 시뮬레이션 실행 핸들러
    const handleRunExperiment = async () => {
        if (!selectedPId || !selectedIId) return;

        setLoading(true);
        setResult(null);

        try {
            const data = await aiApi.runAiSimulation(selectedPId, selectedIId);
            setResult(data || {});
        } catch (error) {
            console.error("Simulation Error:", error);
            alert("AI 시뮬레이션 서버와 통신 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

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

                        {/* 중복 제거된 리스트 컴포넌트 사용 */}
                        <SelectionList
                            title="1. 포트폴리오 선택"
                            items={portfolios}
                            selectedId={selectedPId}
                            onSelect={setSelectedPId}
                            unit="종목"
                        />

                        <div className={styles.divider} />

                        <SelectionList
                            title="2. 결합 지수 선택"
                            items={indexes}
                            selectedId={selectedIId}
                            onSelect={setSelectedIId}
                            unit="지표"
                        />

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
                    {result ? (
                        <SimulationDashboard result={result} />
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

// ---------------------------------------------------------------------------
// 3. 분리된 하위 컴포넌트: 선택 리스트 (중복 제거)
// ---------------------------------------------------------------------------
interface SelectionListProps {
    title: string;
    items: GroupedItem[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    unit: string;
}

function SelectionList({ title, items, selectedId, onSelect, unit }: SelectionListProps) {
    return (
        <>
            <div className={styles.sectionHeader}>{title}</div>
            <div className={styles.list}>
                {items.map(item => (
                    <div
                        key={item.id}
                        className={`${styles.listItem} ${selectedId === item.id ? styles.listItemSelected : ''}`}
                        onClick={() => onSelect(item.id)}
                    >
                        <div className={`${styles.listItemRadio} ${selectedId === item.id ? styles.listItemRadioSelected : ''}`}>
                            {selectedId === item.id && <div className={styles.radioThumb} />}
                        </div>
                        <div>
                            <div className={styles.listItemName}>
                                {item.name}
                                {item.group === '공개' && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--accent2)' }}>공개</span>}
                            </div>
                            <div className={styles.listItemMeta}>{unit} {item.count}개</div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// 4. 분리된 하위 컴포넌트: 결과 대시보드
// ---------------------------------------------------------------------------
function SimulationDashboard({ result }: { result: AiSimulationResult }) {
    const perfReturn = result.performance?.return || 0;
    const perfDrawdown = result.performance?.drawdown || 0;
    const perfScore = result.performance?.score || 0;
    const simulationChartData = result.simulationChart || [];
    const radarChartData = result.radarChart || [];
    const recommendationText = result.recommendation || "분석 결과가 제공되지 않았습니다.";

    const getDirectionBadge = (score: number) => {
        if (score > 55) return <span className={styles.badgeUp}>📈 상승 (호재)</span>;
        if (score < 45) return <span className={styles.badgeDown}>📉 하락 (악재)</span>;
        return <span className={styles.badgeSteady}>➡️ 중립</span>;
    };

    return (
        <div>
            {/* 요약 카드 */}
            <div className={styles.summaryGrid} style={{ marginBottom: '20px' }}>
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

            {/* 리포트 배너 */}
            <div className={styles.reportBanner}>
                <span className={styles.reportBadge}>AI ANALYSIS</span>
                <span className={styles.reportText}>{recommendationText}</span>
            </div>

            {/* 메인 차트 및 지표 반응 리스트 */}
            <div className={styles.resultDashboardGrid}>
                <Card title="미래 성과 시뮬레이션 (3개월 ~ 1년)">
                    <div style={{ width: '100%', height: 320 }}>
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

                <Card title="지표별 포트폴리오 반응">
                    <div className={styles.sensitivityList}>
                        {radarChartData.map((item, idx) => (
                            <div key={idx} className={styles.sensitivityRow}>
                                <span className={styles.indicatorName}>{item.subject}</span>
                                {getDirectionBadge(item.portfolio)}
                            </div>
                        ))}
                        {radarChartData.length === 0 && (
                            <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
                                분석된 지표 정보가 없습니다.
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}