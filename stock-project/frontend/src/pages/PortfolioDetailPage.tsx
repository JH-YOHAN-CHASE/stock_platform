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

  const isOwner = user?.id === portfolio.userId;

  // 파이차트 데이터 - weight 있으면 사용, 없으면 quantity 기반
  const pieData = portfolio.items.map((item, i) => ({
    name: item.ticker,
    value: item.weight ?? item.quantity,
    color: COLORS[i % COLORS.length],
  }));

  const totalValue = portfolio.items.reduce(
    (sum, item) => sum + item.quantity * item.avgBuyPrice, 0
  );

  return (
    <div>
      <PageHeader
        title={portfolio.name}
        subtitle={portfolio.description || ''}
        action={
          isOwner ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/portfolios/${id}/edit`)}>수정</Button>
              <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>삭제</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/portfolios/compare')}>비교하기</Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => navigate('/portfolios/compare')}>비교하기</Button>
          )
        }
      />

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <Card>
          <div className={styles.summaryLabel}>총 종목</div>
          <div className={styles.summaryValue}>{portfolio.items.length}<span className={styles.summaryUnit}>개</span></div>
        </Card>
        <Card>
          <div className={styles.summaryLabel}>총 매수금액</div>
          <div className={styles.summaryValue} style={{ fontSize: 20 }}>
            {totalValue.toLocaleString()}<span className={styles.summaryUnit}>원</span>
          </div>
        </Card>
        <Card>
          <div className={styles.summaryLabel}>공개 여부</div>
          <div className={styles.summaryValue} style={{ fontSize: 18, color: portfolio.isPublic ? 'var(--green)' : 'var(--text2)' }}>
            {portfolio.isPublic ? '공개' : '비공개'}
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
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => [val, '비중/수량']} />
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
                  <th>종목코드</th>
                  <th>종목명</th>
                  <th>수량</th>
                  <th>평균단가</th>
                  <th>평가금액</th>
                  <th>비중</th>
                  <th>매수일</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.items.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.ticker}>{item.ticker}</td>
                    <td>{item.stockName}</td>
                    <td className="mono">{item.quantity.toLocaleString()}</td>
                    <td className="mono">{item.avgBuyPrice.toLocaleString()}</td>
                    <td className="mono">{(item.quantity * item.avgBuyPrice).toLocaleString()}</td>
                    <td>{item.weight != null ? `${item.weight}%` : '—'}</td>
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
