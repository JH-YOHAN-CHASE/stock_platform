import api from './client';
import type { ApiResponse } from '../types';

export const marketApi = {
    getStockPrice: (ticker: string) =>
        api.get<ApiResponse<number>>('/market/price', { params: { ticker } }).then(r => r.data.data),

    getStockPriceByDate: (ticker: string, date: string) =>
        api.get<ApiResponse<number>>('/market/price/history', { params: { ticker, date } }).then(r => r.data.data),
};