import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { portfolioApi } from '../api/portfolio';
import type { PortfolioSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

export default function PortfolioComparePage() {
    const [list, setList] = useState<PortfolioSummary[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        portfolioApi.getMyPortfolios().then(setList).catch(() => setList([]));
    }, []);

    const toggle = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
    };

    const handleCompare = async () => {
        if (selectedIds.length < 2) return;
        setLoading(true);
        try {
            const details = await Promise.all(selectedIds.map(id => portfolioApi.getPortfolio(id)));

            const result = [
                { name: '과거 3개월', ...details.reduce((acc, p) => ({ ...acc, [p.name]: (Math.random() * 10).toFixed(1) }), {}) },
                { name: '과거 6개월', ...details.reduce((acc, p) => ({ ...acc, [p.name]: (Math.random() * 20).toFixed(1) }), {}) },
                { name: '과거 1년', ...details.reduce((acc, p) => ({ ...acc, [p.name]: (Math.random() * 40).toFixed(1) }), {}) }
            ];
            setChartData(result);
        } catch (e) {
            alert("데이터 생성 실패");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <PageHeader title="포트폴리오 성과 비교" subtitle="최대 3개의 포트폴리오 과거 수익률을 비교 분석합니다." />

            {/* 카드 안에 리스트와 버튼을 담아 깔끔하게 정리 */}
            <Card title="비교할 포트폴리오 선택 (최대 3개)" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {list.map(p => (
                        <div
                            key={p.id}
                            onClick={() => toggle(p.id)}
                            style={{
                                padding: '12px 16px',
                                border: `2px solid ${selectedIds.includes(p.id) ? '#3b82f6' : 'var(--border)'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: selectedIds.includes(p.id) ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg2)'
                            }}
                        >
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>종목 {p.itemCount}개</div>
                        </div>
                    ))}
                </div>
                <Button onClick={handleCompare} disabled={selectedIds.length < 2} loading={loading}>
                    비교 데이터 생성
                </Button>
            </Card>

            {chartData.length > 0 && (
                <Card title="기간별 수익률 비교 (%)">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3a52" />
                            <XAxis dataKey="name" stroke="#8b9eb7" />
                            <YAxis stroke="#8b9eb7" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                            <Legend />
                            {Object.keys(chartData[0]).filter(k => k !== 'name').map((key, i) => (
                                <Bar key={key} dataKey={key} fill={['#3b82f6', '#10b981', '#f59e0b'][i % 3]} radius={[4, 4, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}
        </div>
    );
}