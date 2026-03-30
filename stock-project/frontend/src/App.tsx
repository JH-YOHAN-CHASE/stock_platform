// src/App.tsx
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
import AiExperimentPage from './pages/AiExperimentPage'; // ✅ 새 페이지 추가

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

                <Route path="/" element={<Layout />}>
                    {/* 🟢 누구에게나 개방형 페이지 */}
                    <Route index element={<DashboardPage />} />
                    <Route path="portfolios" element={<PortfolioListPage />} />
                    <Route path="portfolios/:id" element={<PortfolioDetailPage />} />
                    <Route path="indexes" element={<IndexListPage />} />
                    <Route path="indexes/:id" element={<IndexDetailPage />} />
                    {/* ✅ AI 실험 페이지를 개방형으로 추가하여 개념 홍보 */}
                    <Route path="ai-experiment" element={<AiExperimentPage />} />

                    {/* 🔴 로그인해야만 접근 가능한 페이지 (PrivateRoute 적용) */}
                    <Route path="portfolios/new" element={<PrivateRoute><PortfolioFormPage /></PrivateRoute>} />
                    <Route path="portfolios/:id/edit" element={<PrivateRoute><PortfolioFormPage /></PrivateRoute>} />
                    <Route path="portfolios/compare" element={<PrivateRoute><PortfolioComparePage /></PrivateRoute>} />
                    <Route path="indexes/new" element={<PrivateRoute><IndexFormPage /></PrivateRoute>} />
                    <Route path="indexes/:id/edit" element={<PrivateRoute><IndexFormPage /></PrivateRoute>} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}