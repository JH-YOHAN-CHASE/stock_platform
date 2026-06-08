import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import styles from './LoginPage.module.css';

const BACKEND = 'http://54.116.11.250:8083';

export default function LoginPage() {
    const { isAuthenticated } = useAuthStore();
    if (isAuthenticated) return <Navigate to="/" replace />;

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