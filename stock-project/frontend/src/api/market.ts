import api from './client';
import type { ApiResponse } from '../types';

export const marketApi = {
    searchStocks: (query: string) =>
        api.get<ApiResponse<{ ticker: string; name: string; type: string }[]>>('/market/search', { params: { query } }).then(r => r.data.data),

    resolveStock: (query: string) =>
        api.get<ApiResponse<{ ticker: string; name: string; type: string }>>('/market/resolve', { params: { query } }).then(r => r.data.data),

    getStockPrice: (ticker: string) =>
        api.get<ApiResponse<number>>('/market/price', { params: { ticker } }).then(r => r.data.data),

    getStockPriceByDate: (ticker: string, date: string) =>
        api.get<ApiResponse<number>>('/market/price/history', { params: { ticker, date } }).then(r => r.data.data),

    getRawPrice: (ticker: string, date?: string) =>
        api.get<ApiResponse<number>>('/market/price/raw', { params: date ? { ticker, date } : { ticker } }).then(r => r.data.data),
};