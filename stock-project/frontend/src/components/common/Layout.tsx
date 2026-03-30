import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import styles from './Layout.module.css';

const NAV = [
  { to: '/',                label: '대시보드',        icon: '◈' },
  { to: '/portfolios',      label: '포트폴리오',       icon: '▦' },
  { to: '/portfolios/compare', label: '포트폴리오 비교', icon: '⇄' },
  { to: '/indexes',         label: '나만의 지수',      icon: '◉' },
    { to: '/ai-experiment',   label: 'AI & 빅데이터 실험', icon: '🤖' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>MONEY CHASING</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.userSection}>
          {user?.profileImage && (
            <img src={user.profileImage} alt="profile" className={styles.avatar} />
          )}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userEmail}>{user?.email}</div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn} title="로그아웃">⏻</button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
