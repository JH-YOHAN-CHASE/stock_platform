import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import PortfolioListPage from './pages/PortfolioListPage';
import PortfolioDetailPage from './pages/PortfolioDetailPage';
import PortfolioComparePage from './pages/PortfolioComparePage';
import PortfolioFormPage from './pages/PortfolioFormPage';
import IndexListPage from './pages/IndexListPage';
import IndexDetailPage from './pages/IndexDetailPage';
import IndexFormPage from './pages/IndexFormPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth2/callback" element={<OAuthCallbackPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="portfolios" element={<PortfolioListPage />} />
          <Route path="portfolios/new" element={<PortfolioFormPage />} />
          <Route path="portfolios/:id" element={<PortfolioDetailPage />} />
          <Route path="portfolios/:id/edit" element={<PortfolioFormPage />} />
          <Route path="portfolios/compare" element={<PortfolioComparePage />} />
          <Route path="indexes" element={<IndexListPage />} />
          <Route path="indexes/new" element={<IndexFormPage />} />
          <Route path="indexes/:id" element={<IndexDetailPage />} />
          <Route path="indexes/:id/edit" element={<IndexFormPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
