import api from './client';
import type { ApiResponse } from '../types';

export const marketApi = {
    resolveStock: (query: string) =>
        api.get<ApiResponse<{ ticker: string; name: string; type: string }>>('/market/resolve', { params: { query } }).then(r => r.data.data),

    getStockPrice: (ticker: string) =>
        api.get<ApiResponse<number>>('/market/price', { params: { ticker } }).then(r => r.data.data),

    getStockPriceByDate: (ticker: string, date: string) =>
        api.get<ApiResponse<number>>('/market/price/history', { params: { ticker, date } }).then(r => r.data.data),
};