import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
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

  // 비교 차트 데이터: 각 포트폴리오의 총 매수금액
  const barData = compared.map((p, i) => ({
    name: p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name,
    총매수금액: p.items.reduce((s, item) => s + item.quantity * item.avgBuyPrice, 0),
    종목수: p.items.length,
    fill: COLORS[i],
  }));

  // 겹치는 ticker
  const allTickers = [...new Set(compared.flatMap((p) => p.items.map((i) => i.ticker)))];
  const radarData = allTickers.slice(0, 8).map((ticker) => {
    const row: Record<string, string | number> = { ticker };
    compared.forEach((p) => {
      const item = p.items.find((i) => i.ticker === ticker);
      row[p.name] = item ? item.quantity : 0;
    });
    return row;
  });

  const allList = [...myList.map((p) => ({ ...p, _tag: '내 포트폴리오' })), ...publicList.map((p) => ({ ...p, _tag: '공개' }))];

  return (
    <div>
      <PageHeader title="포트폴리오 비교" subtitle="최대 4개의 포트폴리오를 선택해 비교하세요" />

      <div className={styles.layout}>
        {/* Selector */}
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
                <div className={styles.listItemInfo}>
                  <div className={styles.listItemName}>{p.name}</div>
                  <div className={styles.listItemMeta}>{p._tag} · {p.itemCount}개 종목</div>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={handleCompare} loading={loading} style={{ width: '100%', marginTop: 16 }}>
            비교 시작
          </Button>
        </Card>

        {/* Results */}
        <div className={styles.results}>
          {compared.length === 0 ? (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>⇄</div>
              <div className={styles.placeholderText}>비교할 포트폴리오를 2개 이상 선택하세요</div>
            </div>
          ) : (
            <>
              {/* Bar Chart - 총 매수금액 */}
              <Card>
                <h3 className={styles.chartTitle}>총 매수금액 비교</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text2)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} tickFormatter={(v) => (v / 1000000).toFixed(0) + 'M'} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString() + '원', '총 매수금액']} contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    <Bar dataKey="총매수금액" radius={[6, 6, 0, 0]}>
                      {barData.map((entry, i) => (
                        <rect key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 종목 겹침 레이더 */}
              {radarData.length > 0 && compared.length >= 2 && (
                <Card style={{ marginTop: 16 }}>
                  <h3 className={styles.chartTitle}>종목 보유 수량 비교</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="ticker" tick={{ fill: 'var(--text2)', fontSize: 12 }} />
                      {compared.map((p, i) => (
                        <Radar key={p.id} name={p.name} dataKey={p.name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                      ))}
                      <Legend />
                      <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* 종목별 상세 비교 테이블 */}
              <Card style={{ marginTop: 16 }}>
                <h3 className={styles.chartTitle}>종목 상세 비교</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>종목</th>
                        {compared.map((p, i) => (
                          <th key={p.id} style={{ color: COLORS[i] }}>{p.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allTickers.map((ticker) => (
                        <tr key={ticker}>
                          <td className={styles.ticker}>{ticker}</td>
                          {compared.map((p) => {
                            const item = p.items.find((i) => i.ticker === ticker);
                            return (
                              <td key={p.id}>
                                {item ? `${item.quantity.toLocaleString()}주 / ${item.avgBuyPrice.toLocaleString()}원` : <span style={{ color: 'var(--text3)' }}>—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
