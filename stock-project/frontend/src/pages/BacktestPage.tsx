import { useEffect, useState } from 'react';
import { portfolioApi } from '../api/portfolio';
import { backtestApi, type BacktestResult } from '../api/backtest';
import type { PortfolioSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import styles from './BacktestPage.module.css';

const PERIODS = [
  { label: '1개월', value: '1M' },
  { label: '3개월', value: '3M' },
  { label: '6개월', value: '6M' },
  { label: '1년', value: '1Y' },
  { label: '3년', value: '3Y' },
  { label: '5년', value: '5Y' },
  { label: '10년', value: '10Y' },
  { label: '20년', value: '20Y' },
];

function getDateRange(period: string) {
  const end = new Date();
  const start = new Date(end);
  switch (period) {
    case '1M': start.setMonth(start.getMonth() - 1); break;
    case '3M': start.setMonth(start.getMonth() - 3); break;
    case '6M': start.setMonth(start.getMonth() - 6); break;
    case '1Y': start.setFullYear(start.getFullYear() - 1); break;
    case '3Y': start.setFullYear(start.getFullYear() - 3); break;
    case '5Y': start.setFullYear(start.getFullYear() - 5); break;
    case '10Y': start.setFullYear(start.getFullYear() - 10); break;
    case '20Y': start.setFullYear(start.getFullYear() - 20); break;
  }
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

const fmtReturn = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtMoney = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`;

export default function BacktestPage() {
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [period, setPeriod] = useState('5Y');
  const [investment, setInvestment] = useState(10000000);
  const [useDca, setUseDca] = useState(false);
  const [monthlyAddition, setMonthlyAddition] = useState(500000);
  const [rebalancing, setRebalancing] = useState<'NONE' | 'QUARTERLY' | 'ANNUALLY'>('NONE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      portfolioApi.getMyPortfolios(),
      portfolioApi.getPublicPortfolios(),
    ]).then(([mine, pub]) => {
      const merged = [
        ...mine.map(p => ({ ...p, _group: '내 포트폴리오' })),
        ...pub.filter(p => !mine.some(m => m.id === p.id)).map(p => ({ ...p, _group: '공개 포트폴리오' })),
      ];
      setPortfolios(merged);
      if (merged.length > 0) setPortfolioId(merged[0].id);
    });
  }, []);

  const handleRun = async () => {
    if (!portfolioId) return alert('포트폴리오를 선택하세요');
    if (!investment || investment < 100000) return alert('초기 투자금액을 10만원 이상 입력하세요');
    const { startDate, endDate } = getDateRange(period);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await backtestApi.run({ portfolioId, startDate, endDate, initialInvestment: investment, monthlyAddition: useDca ? monthlyAddition : 0, rebalancing });
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? '백테스트 실행 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fmtAxisY = (v: number) => `${(v / 10000).toFixed(0)}만`;
  const fmtAxisX = (v: string) => {
    if (!v) return '';
    const [y, m] = v.split('-');
    return `${y.slice(2)}.${m}`;
  };

  return (
    <div>
      <PageHeader title="백테스트" subtitle="나의 포트폴리오를 과거 데이터로 시뮬레이션합니다" />

      <Card className={styles.setupCard}>
        <h3 className={styles.sectionTitle}>백테스트 설정</h3>
        <div className={styles.setupGrid}>
          <div className={styles.field}>
            <label className={styles.label}>포트폴리오 선택</label>
            <select
              className={styles.select}
              value={portfolioId ?? ''}
              onChange={e => setPortfolioId(Number(e.target.value))}
            >
              {portfolios.length === 0 && <option value="">포트폴리오 없음</option>}
              {['내 포트폴리오', '공개 포트폴리오'].map(group => {
                const items = (portfolios as any[]).filter(p => p._group === group);
                if (items.length === 0) return null;
                return (
                  <optgroup key={group} label={group}>
                    {items.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>초기 투자금액</label>
            <div className={styles.inputWrapper}>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                value={investment > 0 ? investment.toLocaleString('ko-KR') : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setInvestment(raw ? Number(raw) : 0);
                }}
              />
              <span className={styles.inputSuffix}>원</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>매월 적립</label>
            <div className={styles.dcaRow}>
              <button
                className={`${styles.toggleBtn} ${useDca ? styles.toggleBtnOn : ''}`}
                onClick={() => setUseDca(v => !v)}
              >
                {useDca ? 'ON' : 'OFF'}
              </button>
              {useDca && (
                <div className={styles.inputWrapper} style={{ flex: 1 }}>
                  <input
                    className={styles.input}
                    type="text"
                    inputMode="numeric"
                    value={monthlyAddition > 0 ? monthlyAddition.toLocaleString('ko-KR') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setMonthlyAddition(raw ? Number(raw) : 0);
                    }}
                  />
                  <span className={styles.inputSuffix}>원 / 월</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>리밸런싱</label>
            <select
              className={styles.select}
              value={rebalancing}
              onChange={e => setRebalancing(e.target.value as 'NONE' | 'QUARTERLY' | 'ANNUALLY')}
            >
              <option value="NONE">없음</option>
              <option value="QUARTERLY">분기별 (1월·4월·7월·10월)</option>
              <option value="ANNUALLY">연간 (1월)</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>기간</label>
          <div className={styles.periodBtns}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                className={`${styles.periodBtn} ${period === p.value ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.runRow}>
          <Button onClick={handleRun} loading={loading}>백테스트 실행</Button>
          {loading && (
            <span className={styles.loadingMsg}>
              Yahoo Finance에서 데이터를 불러오는 중입니다. 종목 수에 따라 10~30초 소요될 수 있습니다.
            </span>
          )}
        </div>
      </Card>

      {error && <div className={styles.errorBox}>{error}</div>}

      {result && (
        <>
          <div className={styles.metricsGrid}>
            <Card>
              <div className={styles.metricLabel}>총 수익률</div>
              <div className={`${styles.metricValue} ${result.metrics.totalReturn >= 0 ? styles.green : styles.red}`}>
                {fmtReturn(result.metrics.totalReturn)}
              </div>
              <div className={styles.metricSub}>
                최종 {fmtMoney(result.metrics.finalValue)}
              </div>
              {result.metrics.totalInvested !== result.metrics.initialInvestment && (
                <div className={styles.metricSub}>
                  총 투자 {fmtMoney(result.metrics.totalInvested)}
                </div>
              )}
            </Card>
            <Card>
              <div className={styles.metricLabel}>연환산 수익률 (CAGR)</div>
              <div className={`${styles.metricValue} ${result.metrics.cagr >= 0 ? styles.green : styles.red}`}>
                {fmtReturn(result.metrics.cagr)}
              </div>
            </Card>
            <Card>
              <div className={styles.metricLabel}>최대 낙폭 (MDD)</div>
              <div className={`${styles.metricValue} ${styles.red}`}>
                -{result.metrics.mdd.toFixed(2)}%
              </div>
            </Card>
            <Card>
              <div className={styles.metricLabel}>연간 변동성</div>
              <div className={styles.metricValue}>{result.metrics.volatility.toFixed(2)}%</div>
            </Card>
            <Card>
              <div className={styles.metricLabel}>샤프 비율</div>
              <div className={`${styles.metricValue} ${result.metrics.sharpeRatio >= 0 ? styles.green : styles.red}`}>
                {result.metrics.sharpeRatio.toFixed(2)}
              </div>
            </Card>
            <Card>
              <div className={styles.metricLabel}>벤치마크 수익률</div>
              <div className={styles.benchmarks}>
                <div>
                  KOSPI{' '}
                  <span className={result.metrics.kospiTotalReturn >= 0 ? styles.green : styles.red}>
                    {fmtReturn(result.metrics.kospiTotalReturn)}
                  </span>
                </div>
                <div>
                  S&P500{' '}
                  <span className={result.metrics.sp500TotalReturn >= 0 ? styles.green : styles.red}>
                    {fmtReturn(result.metrics.sp500TotalReturn)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <Card style={{ marginBottom: 20 }}>
            <h3 className={styles.chartTitle}>포트폴리오 vs 벤치마크</h3>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={result.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtAxisX}
                  tick={{ fontSize: 11, fill: 'var(--text3)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={fmtAxisY}
                  tick={{ fontSize: 11, fill: 'var(--text3)' }}
                  width={72}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [fmtMoney(v), name]}
                  labelStyle={{ color: 'var(--text)' }}
                  contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="portfolioValue" name="내 포트폴리오" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="kospiValue" name="KOSPI" stroke="#10b981" dot={false} strokeWidth={1.5} />
                <Line type="monotone" dataKey="sp500Value" name="S&P500" stroke="#f59e0b" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {result.yearlyReturns.length > 0 && (
            <Card>
              <h3 className={styles.chartTitle}>연도별 수익률</h3>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>연도</th>
                      <th>내 포트폴리오</th>
                      <th>KOSPI</th>
                      <th>S&P500</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.yearlyReturns.map(yr => (
                      <tr key={yr.year}>
                        <td className={styles.yearCell}>{yr.year}</td>
                        <td className={yr.portfolioReturn >= 0 ? styles.green : styles.red}>
                          {fmtReturn(yr.portfolioReturn)}
                        </td>
                        <td className={yr.kospiReturn >= 0 ? styles.green : styles.red}>
                          {fmtReturn(yr.kospiReturn)}
                        </td>
                        <td className={yr.sp500Return >= 0 ? styles.green : styles.red}>
                          {fmtReturn(yr.sp500Return)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}