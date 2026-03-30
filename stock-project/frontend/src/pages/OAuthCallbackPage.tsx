import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token   = params.get('token');
    const refresh = params.get('refresh');
    if (token && refresh) {
      login(token, refresh).then(() => navigate('/', { replace: true }));
    } else {
      navigate('/login', { replace: true });
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text2)', fontSize: 14 }}>로그인 처리 중...</p>
    </div>
  );
}
