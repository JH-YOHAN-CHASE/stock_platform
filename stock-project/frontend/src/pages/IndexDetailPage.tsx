import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { indexApi } from '../api/index';
import { useAuthStore } from '../store/authStore';
import type { CustomIndex } from '../types';
import { INDICATOR_LABELS } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './IndexDetailPage.module.css';

const COLORS = ['#3b82f6','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899'];

export default function IndexDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [index, setIndex] = useState<CustomIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    indexApi.getIndex(Number(id)).then(setIndex).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('지수를 삭제하시겠습니까?')) return;
    setDeleting(true);
    await indexApi.deleteIndex(Number(id));
    navigate('/indexes');
  };

  if (loading) return <div className={styles.center}><div className="spinner" /></div>;
  if (!index)  return <div className={styles.center}>지수를 찾을 수 없습니다</div>;

  const isOwner = user?.id === index.userId;

  const barData = index.components.map((c, i) => ({
    name: c.indicatorName.length > 8 ? c.indicatorName.slice(0, 8) + '…' : c.indicatorName,
    weight: Number(c.weight),
    direction: c.direction,
    color: COLORS[i % COLORS.length],
  }));

  const radarData = index.components.map((c) => ({
    subject: c.indicatorName.length > 6 ? c.indicatorName.slice(0, 6) + '…' : c.indicatorName,
    weight: Number(c.weight),
    fullMark: 100,
  }));

  const totalWeight = index.components.reduce((s, c) => s + Number(c.weight), 0);

  return (
    <div>
      <PageHeader
        title={index.name}
        subtitle={index.description || ''}
        action={
          isOwner ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/indexes/${id}/edit`)}>수정</Button>
              <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>삭제</Button>
            </div>
          ) : null
        }
      />

      {/* Stats */}
      <div className={styles.statsGrid}>
        <Card>
          <div className={styles.statLabel}>지표 수</div>
          <div className={styles.statValue} style={{ color: 'var(--accent2)' }}>
            {index.components.length}<span className={styles.statUnit}>개</span>
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>가중치 합계</div>
          <div className={styles.statValue} style={{ color: totalWeight === 100 ? 'var(--green)' : 'var(--red)' }}>
            {totalWeight}<span className={styles.statUnit}>%</span>
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>공개 여부</div>
          <div className={styles.statValue} style={{ fontSize: 18, color: index.isPublic ? 'var(--green)' : 'var(--text2)' }}>
            {index.isPublic ? '공개' : '비공개'}
          </div>
        </Card>
        <Card>
          <div className={styles.statLabel}>제작자</div>
          <div className={styles.statValue} style={{ fontSize: 18 }}>{index.userName}</div>
        </Card>
      </div>

      <div className={styles.body}>
        {/* 레이더 차트 */}
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>지표 가중치 분포</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              <Radar name="가중치" dataKey="weight" stroke="var(--accent2)" fill="var(--accent2)" fillOpacity={0.25} />
              <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v: number) => [`${v}%`, '가중치']} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* 막대 차트 */}
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>지표별 가중치</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: 'var(--text2)', fontSize: 11 }} domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text2)', fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }}
                formatter={(v: number, _: string, props: { payload?: { direction?: number } }) => {
                  const dir = props.payload?.direction === 1 ? '↑ 양의 상관' : '↓ 음의 상관';
                  return [`${v}% (${dir})`, '가중치'];
                }}
              />
              <Bar dataKey="weight" radius={[0, 6, 6, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* 구성 지표 테이블 */}
      <Card style={{ marginTop: 20 }}>
        <h3 className={styles.chartTitle}>구성 지표 상세</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>지표 유형</th>
                <th>지표명</th>
                <th>가중치</th>
                <th>상관 방향</th>
                <th>설명</th>
                <th>데이터 코드</th>
              </tr>
            </thead>
            <tbody>
              {index.components.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{i + 1}</td>
                  <td>
                    <span className={styles.typeBadge}>{INDICATOR_LABELS[c.indicatorType]}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{c.indicatorName}</td>
                  <td>
                    <div className={styles.weightCell}>
                      <span className="mono" style={{ color: COLORS[i % COLORS.length] }}>{c.weight}%</span>
                      <div className={styles.miniBar}>
                        <div className={styles.miniBarFill} style={{ width: `${c.weight}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={c.direction === 1 ? styles.positive : styles.negative}>
                      {c.direction === 1 ? '↑ 양의 상관' : '↓ 음의 상관'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text2)', fontSize: 13 }}>{c.description || '—'}</td>
                  <td style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--text3)' }}>{c.dataSourceCode || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
