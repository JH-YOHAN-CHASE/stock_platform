import { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    LineChart, Line, CartesianGrid
} from 'recharts';
import { portfolioApi } from '../api/portfolio';
import type { Portfolio, PortfolioSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './PortfolioComparePage.module.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function PortfolioComparePage() {
    const [myList, setMyList] = useState<PortfolioSummary[]>([]);
    const [publicList, setPublicList] = useState<PortfolioSummary[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [compared, setCompared] = useState<Portfolio[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        Promise.all([
            portfolioApi.getMyPortfolios(),
            portfolioApi.getPublicPortfolios(),
        ]).then(([my, pub]) => {
            setMyList(my);
            setPublicList(pub);
        });
    }, []);

    const toggle = (id: number) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
        );
    };

    const handleCompare = async () => {
        if (selected.length < 2) return alert('2개 이상 선택하세요');
        setLoading(true);
        const data = await portfolioApi.comparePortfolios(selected);
        setCompared(data);
        setLoading(false);
    };

    // 1. 기존 비교 차트 데이터: 각 포트폴리오의 총 매수금액
    const barData = compared.map((p, i) => ({
        name: p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name,
        총매수금액: p.items.reduce((s, item) => s + item.quantity * item.avgBuyPrice, 0),
        종목수: p.items.length,
        fill: COLORS[i % COLORS.length],
    }));

    // 💡 핵심 수정: 2. [전체 종목] 겹치는 ticker 데이터
    // compared 배열에 있는 모든 종목의 ticker를 중복 없이 모아옵니다. (slice 지움)
    const allTickers = [...new Set(compared.flatMap((p) => p.items.map((i) => i.ticker)))];

    // 차트용 레이더 데이터 생성
    const radarData = allTickers.map((ticker) => {
        const row: Record<string, string | number> = { ticker };
        compared.forEach((p) => {
            const item = p.items.find((i) => i.ticker === ticker);
            // 차트에는 수량만 표시 (수량이 너무 다르면 비중으로 바꾸는 게 좋습니다)
            row[p.name] = item ? item.quantity : 0;
        });
        return row;
    });

    // 💡 3. [신규 추가] 표(Table) 렌더링을 위한 상세 데이터 바인딩 로직
    // 전체 티커 리스트(allTickers)를 순회하며 각 포트폴리오별 상세 정보를 매핑합니다.
    const tableData = allTickers.map(ticker => {
        // 이 티커의 종목명을 찾기 위해 임의의 포트폴리오에서 하나 가져옵니다.
        const stockName = compared.flatMap(p => p.items).find(i => i.ticker === ticker)?.stockName || '';

        const row: any = { ticker, stockName };

        compared.forEach(p => {
            // 해당 포트폴리오에서 이 종목을 가지고 있는지 찾습니다.
            const item = p.items.find(i => i.ticker === ticker);

            // 표에 보여줄 정보를 객체 형태로 담습니다.
            row[p.id] = item ? {
                quantity: item.quantity,
                avgBuyPrice: item.avgBuyPrice,
                purchaseDate: item.purchaseDate,
                weight: item.weight // DB에 비중이 저장되어 있다면 사용
            } : null; // 없으면 null
        });
        return row;
    });

    // 가짜 수익률(Mock) 데이터 (기존 코드 유지)
    const mockPeriods = ['1개월', '3개월', '6개월', '1년', '3년', '설정일 이후'];
    const benchmarkRates = [-0.5, 1.8, 5.2, 8.9, 19.5, 35.0];
    const baseMockRates = [
        [0.3, 1.1, 2.5, 4.2, 12.5, 21.4],
        [0.8, 2.5, 4.8, 8.5, 24.0, 42.8],
        [-1.5, 4.2, 9.5, 15.2, 45.3, 82.1],
        [-3.0, 5.5, 12.0, 20.5, 60.0, 110.0]
    ];
    const returnRateData = mockPeriods.map((period, periodIdx) => {
        const row: any = { period, '벤치마크 (KOSPI)': benchmarkRates[periodIdx] };
        compared.forEach((p, pIdx) => {
            row[p.name] = baseMockRates[pIdx % 4][periodIdx];
        });
        return row;
    });

    // 중복 제거 로직 (기존 코드 유지)
    const myPortfolioIds = new Set(myList.map(p => p.id));
    const filteredPublicList = publicList.filter(p => !myPortfolioIds.has(p.id));
    const allList = [
        ...myList.map((p) => ({ ...p, _tag: '내 포트폴리오' })),
        ...filteredPublicList.map((p) => ({ ...p, _tag: '공개' }))
    ];

    return (
        <div>
            <PageHeader title="포트폴리오 비교" subtitle="최대 4개의 포트폴리오를 선택해 비교하세요" />

            <div className={styles.layout}>
                {/* 왼쪽: 포트폴리오 선택 패널 */}
                <Card className={styles.selectorCard}>
                    <div className={styles.selectorTitle}>포트폴리오 선택 <span className={styles.badge}>{selected.length}/4</span></div>
                    <div className={styles.list}>
                        {allList.map((p) => (
                            <div
                                key={p.id}
                                className={`${styles.listItem} ${selected.includes(p.id) ? styles.listItemSelected : ''}`}
                                onClick={() => toggle(p.id)}
                            >
                                <div className={styles.listItemCheck}>{selected.includes(p.id) ? '✓' : ''}</div>
                                <div className={styles.listItemBody}>
                                    <div className={styles.listItemName}>{p.name}</div>
                                    <div className={styles.listItemMeta}>{p._tag} · {p.itemCount}개 종목</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button
                        onClick={handleCompare}
                        disabled={selected.length < 2 || loading}
                        loading={loading}
                        style={{ marginTop: '16px', width: '100%' }}
                    >
                        비교 시작
                    </Button>
                </Card>

                {/* 오른쪽: 차트 및 표 영역 */}
                <div className={styles.charts}>
                    {compared.length === 0 ? (
                        <div className={styles.placeholder}>
                            <div className={styles.placeholderIcon}>📊</div>
                            <div className={styles.placeholderText}>포트폴리오를 2개 이상 선택하고 비교 시작을 눌러주세요</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 1. 수익률 차트 (생략) */}
                            <Card>
                                <h3 className={styles.chartTitle}>기간별 예상 수익률 비교 (Mock Data)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={returnRateData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3a52" vertical={false} />
                                        <XAxis dataKey="period" stroke="#8b9eb7" tick={{ fill: '#8b9eb7' }} />
                                        <YAxis tickFormatter={(tick) => `${tick}%`} stroke="#8b9eb7" tick={{ fill: '#8b9eb7' }} />
                                        <Tooltip formatter={(val: number) => `${val}%`} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Line type="monotone" dataKey="벤치마크 (KOSPI)" stroke="#8b9eb7" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                                        {compared.map((p, i) => (
                                            <Line key={p.id} type="monotone" dataKey={p.name} stroke={COLORS[i % COLORS.length]} strokeWidth={3} activeDot={{ r: 8 }} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>

                            {/* 2. 총 매수금액 차트 (생략) */}
                            <Card>
                                <h3 className={styles.chartTitle}>총 매수금액 비교</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a3a52" vertical={false} />
                                        <XAxis dataKey="name" stroke="#8b9eb7" tick={{ fill: '#8b9eb7' }} />
                                        <YAxis tickFormatter={(val) => `${(val / 10000).toLocaleString()}만`} stroke="#8b9eb7" tick={{ fill: '#8b9eb7' }} />
                                        <Tooltip formatter={(val: number) => `${val.toLocaleString()}원`} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                        <Bar dataKey="총매수금액" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                            {barData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>

                            {/* ✅ 3. [유지] 종목 겹침 분석 (Radar Chart) - 전체 종목 대상 */}
                            {allTickers.length > 0 && (
                                <Card>
                                    <h3 className={styles.chartTitle}>보유 종목 수량 비교 (전체 종목 대상)</h3>
                                    <ResponsiveContainer width="100%" height={350}>
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                            <PolarGrid stroke="#2a3a52" />
                                            <PolarAngleAxis dataKey="ticker" tick={{ fill: '#8b9eb7', fontSize: 13, fontWeight: 600 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                            {compared.map((p, i) => (
                                                <Radar key={p.id} name={p.name} dataKey={p.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.4} />
                                            ))}
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </Card>
                            )}

                            {/* 💡 ✅ ✅ ✅ 4. [신규 추가] 포트폴리오별 상세 종목 비교 표(Table) */}
                            <Card>
                                <h3 className={styles.chartTitle}>상세 종목 보유 현황 비교</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className={styles.table}>
                                        <thead>
                                        <tr>
                                            <th>종목 (티커)</th>
                                            <th>종목명</th>
                                            {/* 선택된 포트폴리오의 이름으로 동적 헤더 생성 */}
                                            {compared.map((p, i) => (
                                                <th key={p.id} style={{ color: COLORS[i % COLORS.length], textAlign: 'center' }}>
                                                    {p.name}
                                                </th>
                                            ))}
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {tableData.map((row) => (
                                            <tr key={row.ticker}>
                                                {/* 종목 기본 정보 */}
                                                <td className={styles.ticker}>{row.ticker}</td>
                                                <td>{row.stockName}</td>

                                                {/* 각 포트폴리오별 상세 정보 렌더링 */}
                                                {compared.map((p) => {
                                                    const itemData = row[p.id]; // null 이거나 객체이거나
                                                    return (
                                                        <td key={p.id} style={{ textAlign: 'right', borderLeft: '1px solid rgba(42,58,82,0.3)' }}>
                                                            {itemData ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                                                                    <div style={{ color: '#fff', fontWeight: 600 }}>
                                                                        {itemData.quantity.toLocaleString()}주
                                                                    </div>
                                                                    <div style={{ color: 'var(--text3)' }}>
                                                                        평단: {Math.round(itemData.avgBuyPrice).toLocaleString()}원
                                                                    </div>
                                                                    {/* DB에 비중 데이터가 있다면 표시, 없으면 평가금액 수동 계산 */}
                                                                    {itemData.weight != null ? (
                                                                        <div style={{ color: 'var(--accent2)', fontWeight: 'bold', fontSize: '10px' }}>
                                                                            비중 {itemData.weight}%
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ color: 'var(--text3)' }}>
                                                                            약 {Math.round(itemData.quantity * itemData.avgBuyPrice).toLocaleString()}원
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                // 이 포트폴리오가 해당 종목을 가지고 있지 않을 때
                                                                <span style={{ color: 'var(--text3)', display: 'block', textAlign: 'center' }}>—</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}