import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './LoginPage.module.css';

// OAuth2 시작은 백엔드 직접 호출 (프록시 루프 방지)
const BACKEND = 'http://localhost:8083';

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleGoogle = () => {
    window.location.href = `${BACKEND}/oauth2/authorization/google`;
  };

  const handleNaver = () => {
    window.location.href = `${BACKEND}/oauth2/authorization/naver`;
  };

  return (
    <div className={styles.root}>
      <div className={styles.grid} />
      <div className={styles.glow} />

      <div className={styles.box}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>◈</span>
          <h1 className={styles.brandName}>StockIndex</h1>
        </div>

        <p className={styles.tagline}>
          나만의 포트폴리오를 만들고<br />
          <strong>나만의 경제 지수</strong>를 설계하세요
        </p>

        <div className={styles.features}>
          {[
            ['▦', '포트폴리오 구성 & 비교'],
            ['◉', '금리·환율·유가로 나만의 지수'],
            ['⇄', '다른 투자자와 실시간 비교'],
          ].map(([icon, label]) => (
            <div key={label} className={styles.feature}>
              <span className={styles.featureIcon}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className={styles.divider}><span>소셜 로그인</span></div>

        <div className={styles.buttons}>
          <button onClick={handleGoogle} className={styles.googleBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 계속하기
          </button>

          <button onClick={handleNaver} className={styles.naverBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            네이버로 계속하기
          </button>
        </div>

        <p className={styles.legal}>
          로그인 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
        </p>
      </div>
    </div>
  );
}
