import api from './client';
import type { ApiResponse, Portfolio, PortfolioForm, PortfolioSummary } from '../types';

export const portfolioApi = {
  getMyPortfolios: () =>
    api.get<ApiResponse<PortfolioSummary[]>>('/portfolios/my').then((r) => r.data.data),

  getPublicPortfolios: () =>
    api.get<ApiResponse<PortfolioSummary[]>>('/portfolios/public').then((r) => r.data.data),

  getPortfolio: (id: number) =>
    api.get<ApiResponse<Portfolio>>(`/portfolios/${id}`).then((r) => r.data.data),

  comparePortfolios: (ids: number[]) =>
    api
      .get<ApiResponse<Portfolio[]>>('/portfolios/compare', { params: { ids: ids.join(',') } })
      .then((r) => r.data.data),

  createPortfolio: (form: PortfolioForm) =>
    api.post<ApiResponse<Portfolio>>('/portfolios', form).then((r) => r.data.data),

  updatePortfolio: (id: number, form: PortfolioForm) =>
    api.put<ApiResponse<Portfolio>>(`/portfolios/${id}`, form).then((r) => r.data.data),

  deletePortfolio: (id: number) =>
    api.delete<ApiResponse<null>>(`/portfolios/${id}`).then((r) => r.data),
};
