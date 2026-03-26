import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioApi } from '../api/portfolio';
import type { PortfolioSummary } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './ListPage.module.css';

export default function PortfolioListPage() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'my' | 'public'>('my');

  const load = async () => {
    setLoading(true);
    try {
      const data = tab === 'my'
        ? await portfolioApi.getMyPortfolios()
        : await portfolioApi.getPublicPortfolios();
      setPortfolios(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  return (
    <div>
      <PageHeader
        title="포트폴리오"
        subtitle="나만의 종목 포트폴리오를 만들고 관리하세요"
        action={
          <Button onClick={() => navigate('/portfolios/new')}>＋ 포트폴리오 만들기</Button>
        }
      />

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'my' ? styles.tabActive : ''}`} onClick={() => setTab('my')}>내 포트폴리오</button>
        <button className={`${styles.tab} ${tab === 'public' ? styles.tabActive : ''}`} onClick={() => setTab('public')}>공개 포트폴리오</button>
      </div>

      {loading ? (
        <div className={styles.center}><div className="spinner" /></div>
      ) : portfolios.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>▦</div>
          <div className={styles.emptyText}>{tab === 'my' ? '포트폴리오를 만들어 보세요' : '공개된 포트폴리오가 없습니다'}</div>
          {tab === 'my' && <Button onClick={() => navigate('/portfolios/new')}>＋ 만들기</Button>}
        </div>
      ) : (
        <div className={styles.grid}>
          {portfolios.map((p) => (
            <Card key={p.id} hoverable onClick={() => navigate(`/portfolios/${p.id}`)}>
              <div className={styles.cardHead}>
                <span className={styles.cardIcon}>▦</span>
                <span className={`${styles.visibilityBadge} ${p.isPublic ? styles.public : styles.private}`}>
                  {p.isPublic ? '공개' : '비공개'}
                </span>
              </div>
              <div className={styles.cardName}>{p.name}</div>
              {p.description && <div className={styles.cardDesc}>{p.description}</div>}
              <div className={styles.cardMeta}>
                <span>종목 {p.itemCount}개</span>
                <span>{p.userName}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
