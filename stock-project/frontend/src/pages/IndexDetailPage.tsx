import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { indexApi } from '../api/index';
import { useAuthStore } from '../store/authStore';
import type { CustomIndex } from '../types';
import { INDICATOR_LABELS } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './IndexDetailPage.module.css';

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

            {/* 구성 지표 테이블 */}
            <Card style={{ marginTop: 24 }}>
                <h3 className={styles.chartTitle}>구성 지표 상세</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th>#</th>
                            <th>지표 유형</th>
                            <th>지표명</th>
                            <th>방향성</th>
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
                                {/* 💡 가중치 렌더링 영역 완전히 제거됨 */}
                                <td>
                    <span className={c.direction === 1 ? styles.positive : styles.negative}>
                      {c.direction === 1 ? '↑ 상승' : '↓ 하락'}
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