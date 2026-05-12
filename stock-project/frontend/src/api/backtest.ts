import api from './client';
import type { ApiResponse } from '../types';

export interface BacktestRequest {
  portfolioId: number;
  startDate: string;
  endDate: string;
  initialInvestment: number;
  monthlyAddition: number;
  rebalancing: 'NONE' | 'QUARTERLY' | 'ANNUALLY';
}

export interface ChartPoint {
  date: string;
  portfolioValue: number;
  kospiValue: number;
  sp500Value: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  cagr: number;
  mdd: number;
  volatility: number;
  sharpeRatio: number;
  kospiTotalReturn: number;
  sp500TotalReturn: number;
  finalValue: number;
  initialInvestment: number;
  totalInvested: number;
}

export interface YearlyReturn {
  year: number;
  portfolioReturn: number;
  kospiReturn: number;
  sp500Return: number;
}

export interface BacktestResult {
  chartData: ChartPoint[];
  metrics: BacktestMetrics;
  yearlyReturns: YearlyReturn[];
}

export const backtestApi = {
  run: (request: BacktestRequest) =>
    api.post<ApiResponse<BacktestResult>>('/backtest', request).then(r => r.data.data),
};