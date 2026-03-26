import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { indexApi } from '../api/index';
import type { CustomIndexSummary } from '../types';
import { INDICATOR_LABELS } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './ListPage.module.css';

export default function IndexListPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<CustomIndexSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'my' | 'public'>('my');

  useEffect(() => {
    setLoading(true);
    const fn = tab === 'my' ? indexApi.getMyIndexes : indexApi.getPublicIndexes;
    fn().then(setList).finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <PageHeader
        title="나만의 지수"
        subtitle="금리·환율·유가 등 경제 지표로 나만의 투자 지수를 만드세요"
        action={<Button onClick={() => navigate('/indexes/new')}>＋ 지수 만들기</Button>}
      />

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'my' ? styles.tabActive : ''}`} onClick={() => setTab('my')}>내 지수</button>
        <button className={`${styles.tab} ${tab === 'public' ? styles.tabActive : ''}`} onClick={() => setTab('public')}>공개 지수</button>
      </div>

      {loading ? (
        <div className={styles.center}><div className="spinner" /></div>
      ) : list.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>◉</div>
          <div className={styles.emptyText}>{tab === 'my' ? '나만의 지수를 만들어 보세요' : '공개된 지수가 없습니다'}</div>
          {tab === 'my' && <Button onClick={() => navigate('/indexes/new')}>＋ 만들기</Button>}
        </div>
      ) : (
        <div className={styles.grid}>
          {list.map((idx) => (
            <Card key={idx.id} hoverable onClick={() => navigate(`/indexes/${idx.id}`)}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon} style={{ color: 'var(--accent2)' }}>◉</span>
                <span className={`${styles.visibilityBadge} ${idx.isPublic ? styles.public : styles.private}`}>
                  {idx.isPublic ? '공개' : '비공개'}
                </span>
              </div>
              <div className={styles.cardName}>{idx.name}</div>
              {idx.description && <div className={styles.cardDesc}>{idx.description}</div>}
              <div className={styles.cardMeta}>
                <span>지표 {idx.componentCount}개</span>
                <span>{idx.userName}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
