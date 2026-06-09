import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { portfolioApi } from '../api/portfolio';
import { useAuthStore } from '../store/authStore';
import type { Portfolio } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './PortfolioDetailPage.module.css';

const COLORS = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export default function PortfolioDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        portfolioApi.getPortfolio(Number(id)).then(setPortfolio).finally(() => setLoading(false));
    }, [id]);

    const handleDelete = async () => {
        if (!confirm('포트폴리오를 삭제하시겠습니까?')) return;
        setDeleting(true);
        await portfolioApi.deletePortfolio(Number(id));
        navigate('/portfolios');
    };

    if (loading) return <div className={styles.center}><div className="spinner" /></div>;
    if (!portfolio) return <div className={styles.center}>포트폴리오를 찾을 수 없습니다</div>;

    // 현재 접속한 유저가 포트폴리오의 주인인지 확인
    const isOwner = user?.id === portfolio.userId;

    const isKorean = (ticker: string) => !/^[A-Za-z]{1,6}$/.test(ticker);
    const displayName = (item: typeof portfolio.items[0]) =>
        isKorean(item.ticker) ? item.stockName : `(${item.ticker}) ${item.stockName}`;

    const evalPrice = (item: typeof portfolio.items[0]) =>
        (item.currentPrice != null && item.currentPrice > 0) ? item.currentPrice : item.avgBuyPrice;

    const totalValue = portfolio.items.reduce(
        (sum, item) => sum + item.quantity * evalPrice(item), 0
    );

    const calcWeight = (item: typeof portfolio.items[0]) =>
        totalValue > 0 ? (item.quantity * evalPrice(item)) / totalValue * 100 : 0;

    // 파이 차트용 데이터
    const pieData = portfolio.items.map((item, i) => ({
        name: displayName(item),
        value: item.quantity * evalPrice(item),
        weight: calcWeight(item),
        color: COLORS[i % COLORS.length],
    }));

    const costBasis = portfolio.items.reduce((sum, item) => sum + item.quantity * item.avgBuyPrice, 0);
    const returnRate = costBasis > 0 ? (totalValue - costBasis) / costBasis * 100 : 0;

    return (
        <div>
            <PageHeader
                title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {portfolio.name}
                        <span style={{
                            fontSize: '0.7rem', fontWeight: 500,
                            color: portfolio.isPublic ? 'var(--green)' : 'var(--text2)',
                            border: '1px solid currentColor', borderRadius: 4,
                            padding: '2px 6px', whiteSpace: 'nowrap',
                        }}>
              {portfolio.isPublic ? '공개' : '비공개'}
            </span>
          </span>
                }
                subtitle={portfolio.description || ''}
                action={
                    isOwner ? (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Button variant="secondary" size="sm" onClick={() => navigate(`/portfolios/${id}/edit`)}>수정</Button>
                            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>삭제</Button>
                            <Button variant="secondary" size="sm" onClick={() => navigate('/portfolios/compare')}>비교하기</Button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>
                👀 타인의 포트폴리오는 수량과 자산 총액을 제외하고 모두 조회됩니다.
              </span>
                            <Button variant="secondary" size="sm" onClick={() => navigate('/portfolios/compare')}>비교하기</Button>
                        </div>
                    )
                }
            />

            {/* 요약 카드 */}
            <div className={styles.summaryGrid}>
                <Card>
                    <div className={styles.summaryLabel}>총 종목</div>
                    <div className={styles.summaryValue}>{portfolio.items.length}<span className={styles.summaryUnit}>개</span></div>
                </Card>
                <Card>
                    <div className={styles.summaryLabel}>총 평가금액</div>
                    <div className={styles.summaryValue} style={{ fontSize: 20, color: !isOwner ? 'var(--text3)' : 'inherit' }}>
                        {isOwner ? <>{totalValue.toLocaleString()}<span className={styles.summaryUnit}>원</span></> : '비공개'}
                    </div>
                </Card>
                <Card>
                    <div className={styles.summaryLabel}>수익률</div>
                    <div className={styles.summaryValue} style={{ fontSize: 20, color: returnRate >= 0 ? 'var(--green)' : 'var(--red, #ef4444)' }}>
                        {returnRate >= 0 ? '+' : ''}{returnRate.toFixed(2)}<span className={styles.summaryUnit}>%</span>
                    </div>
                </Card>
                <Card>
                    <div className={styles.summaryLabel}>소유자</div>
                    <div className={styles.summaryValue} style={{ fontSize: 18 }}>{portfolio.userName}</div>
                </Card>
            </div>

            <div className={styles.body}>
                {/* 파이차트 */}
                {portfolio.items.length > 0 && (
                    <Card className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>종목 구성</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                                    labelLine={true}
                                    fontSize={11}
                                >
                                    {pieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(val: number, name: string, props: any) => {
                                        if (isOwner) {
                                            return [val.toLocaleString('ko-KR') + ' 원', '평가금액'];
                                        } else {
                                            return [`${props.payload.weight.toFixed(2)}%`, '비중'];
                                        }
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                )}

                {/* 종목 테이블 */}
                <Card className={styles.tableCard}>
                    <h3 className={styles.chartTitle}>종목 목록</h3>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                            <tr>
                                <th>종목</th>
                                {isOwner && <th>수량</th>}
                                {/* 평균단가는 모두에게 공개 */}
                                <th>평균단가</th>
                                {isOwner && <th>평가금액</th>}
                                <th>비중</th>
                                {/* 매수일자도 모두에게 공개 */}
                                <th>매수일</th>
                            </tr>
                            </thead>
                            <tbody>
                            {portfolio.items.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        {isKorean(item.ticker)
                                            ? item.stockName
                                            : <><span className={styles.ticker}>({item.ticker})</span>{' '}{item.stockName}</>}
                                    </td>
                                    {isOwner && <td className="mono">{item.quantity.toLocaleString()}</td>}

                                    {/* 평균단가 행 (누구나 조회 가능) */}
                                    <td className="mono">{item.avgBuyPrice.toLocaleString('ko-KR')} 원</td>

                                    {isOwner && <td className="mono">{(item.quantity * evalPrice(item)).toLocaleString('ko-KR')} 원</td>}
                                    <td>{totalValue > 0 ? `${calcWeight(item).toFixed(2)}%` : '—'}</td>

                                    {/* 매수일자 행 (누구나 조회 가능) */}
                                    <td className={styles.date}>{item.purchaseDate ?? '—'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}