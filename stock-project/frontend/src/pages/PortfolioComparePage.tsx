import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { portfolioApi } from '../api/portfolio';
import { backtestApi } from '../api/backtest';
import type { PortfolioSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './PortfolioComparePage.module.css';

export default function PortfolioComparePage() {
    const [list, setList] = useState<PortfolioSummary[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // 차트 상태 관리
    const [chartData, setChartData] = useState<any[]>([]);
    const [portfolioNames, setPortfolioNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // 백테스트 시뮬레이션 설정 폼 상태
    const [initialInvestment, setInitialInvestment] = useState<number>(30000);
    const [monthlyAddition, setMonthlyAddition] = useState<number>(0);
    const [startDate, setStartDate] = useState<string>('2023-01-01');
    const [endDate, setEndDate] = useState<string>('2026-01-01');
    const [rebalancing, setRebalancing] = useState<'NONE' | 'QUARTERLY' | 'ANNUALLY'>('NONE');

    useEffect(() => {
        Promise.all([
            portfolioApi.getMyPortfolios().catch(() => []),
            portfolioApi.getPublicPortfolios().catch(() => []),
        ]).then(([mine, pub]) => {
            const merged = [
                ...mine.map(p => ({ ...p, _group: '내 포트폴리오' })),
                ...pub.filter(p => !mine.some(m => m.id === p.id)).map(p => ({ ...p, _group: '공개' })),
            ];
            setList(merged as any);
        });
    }, []);

    const toggle = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : prev.length < 3 ? [...prev, id] : prev
        );
    };

    const handleCompare = async () => {
        if (selectedIds.length < 2) {
            alert("비교할 포트폴리오를 2개 이상 선택해주세요.");
            return;
        }
        setLoading(true);
        try {
            // 💡 1. 선택된 포트폴리오들을 각각 백테스트 API로 호출 (Promise.all 병렬 처리)
            const results = await Promise.all(
                selectedIds.map(async (id) => {
                    const data = await backtestApi.run({
                        portfolioId: id,
                        startDate,
                        endDate,
                        initialInvestment,
                        monthlyAddition,
                        rebalancing
                    });
                    const portfolioInfo = list.find(p => p.id === id);
                    return { name: portfolioInfo?.name || `포트폴리오 ${id}`, data };
                })
            );

            // 💡 2. Recharts가 그릴 수 있도록 날짜(date)를 기준으로 데이터 병합
            const mergedMap = new Map<string, any>();
            const names: string[] = [];

            results.forEach(res => {
                names.push(res.name);
                res.data.chartData.forEach(point => {
                    // 해당 날짜가 없으면 초기화
                    const existing = mergedMap.get(point.date) || { date: point.date };
                    // 포트폴리오 이름을 Key로 사용하여 자산 가치(portfolioValue) 매핑
                    existing[res.name] = point.portfolioValue;
                    mergedMap.set(point.date, existing);
                });
            });

            // 날짜 오름차순 정렬
            const finalChartData = Array.from(mergedMap.values()).sort((a, b) => a.date.localeCompare(b.date));

            setChartData(finalChartData);
            setPortfolioNames(names);
        } catch (e) {
            console.error(e);
            alert("데이터 생성에 실패했습니다. (API 서버 확인 필요)");
        } finally {
            setLoading(false);
        }
    };

    // 원화 포맷팅 함수 (툴팁 등에서 사용)
    const formatCurrency = (value: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);

    return (
        <div style={{ padding: '20px' }}>
            <PageHeader title="포트폴리오 성과 비교" subtitle="실제 과거 주가 데이터를 바탕으로 내 포트폴리오들의 성과를 시뮬레이션합니다." />

            <div className={styles.layout}>
                {/* 왼쪽(또는 상단): 포트폴리오 선택 및 설정 영역 */}
                <div className={styles.selectorCard}>
                    <Card title="1. 비교 포트폴리오 (최대 3개)" style={{ marginBottom: '16px' }}>
                        <div className={styles.list} style={{ marginBottom: '16px' }}>
                            {list.map(p => {
                                const isSelected = selectedIds.includes(p.id);
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => toggle(p.id)}
                                        className={`${styles.listItem} ${isSelected ? styles.listItemSelected : ''}`}
                                        style={{ backgroundColor: isSelected ? 'var(--primary-light, rgba(59,130,246,0.1))' : '' }}
                                    >
                                        <div className={styles.listItemName}>{p.name}{(p as any)._group === '공개' && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--accent2)' }}>공개</span>}</div>
                                        <div className={styles.listItemMeta}>종목 {p.itemCount}개</div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card title="2. 백테스트 설정">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>초기 투자금 (원)</label>
                                <input type="number" value={initialInvestment} onChange={e => setInitialInvestment(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>매월 적립금 (원)</label>
                                <input type="number" value={monthlyAddition} onChange={e => setMonthlyAddition(Number(e.target.value))} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>시작일</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>종료일</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>리밸런싱 주기</label>
                                <select value={rebalancing} onChange={e => setRebalancing(e.target.value as any)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    <option value="NONE">안함 (Buy & Hold)</option>
                                    <option value="QUARTERLY">분기별 (Quarterly)</option>
                                    <option value="ANNUALLY">연 1회 (Annually)</option>
                                </select>
                            </div>
                        </div>
                        <Button onClick={handleCompare} disabled={selectedIds.length < 2} loading={loading} style={{ width: '100%' }}>
                            시뮬레이션 실행
                        </Button>
                    </Card>
                </div>

                {/* 오른쪽(또는 하단): 차트 영역 */}
                <div style={{ width: '100%' }}>
                    {chartData.length > 0 ? (
                        <Card>
                            <div className={styles.chartTitle}>기간별 자산 추이 비교 (₩)</div>
                            <ResponsiveContainer width="100%" height={500}>
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3a52" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#8b9eb7"
                                        tickFormatter={(tick) => tick.substring(0, 7)} // "YYYY-MM" 형식 축약
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis
                                        stroke="#8b9eb7"
                                        tickFormatter={(value) => `${(value / 10000).toLocaleString()}만`} // 만원 단위 축약
                                        tick={{ fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        formatter={(value: number) => [formatCurrency(value), '자산']}
                                        labelFormatter={(label) => `${label} 기준`}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    {/* 포트폴리오 개수만큼 동적으로 라인 생성 */}
                                    {portfolioNames.map((name, i) => (
                                        <Line
                                            key={name}
                                            type="monotone"
                                            dataKey={name}
                                            stroke={['#3b82f6', '#10b981', '#f59e0b'][i % 3]}
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    ) : (
                        <div className={styles.placeholder}>
                            <div className={styles.placeholderIcon}>📊</div>
                            <div className={styles.placeholderText}>포트폴리오를 2개 이상 선택하고 시뮬레이션을 실행해보세요.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}