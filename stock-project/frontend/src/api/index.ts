import api from './client';
import type { ApiResponse, CustomIndex, CustomIndexForm, CustomIndexSummary } from '../types';

export const indexApi = {
  getMyIndexes: () =>
    api.get<ApiResponse<CustomIndexSummary[]>>('/indexes/my').then((r) => r.data.data),

  getPublicIndexes: () =>
    api.get<ApiResponse<CustomIndexSummary[]>>('/indexes/public').then((r) => r.data.data),

  getAccessibleIndexes: () =>
    api.get<ApiResponse<CustomIndexSummary[]>>('/indexes/accessible').then((r) => r.data.data),

  getIndex: (id: number) =>
    api.get<ApiResponse<CustomIndex>>(`/indexes/${id}`).then((r) => r.data.data),

  createIndex: (form: CustomIndexForm) =>
    api.post<ApiResponse<CustomIndex>>('/indexes', form).then((r) => r.data.data),

  updateIndex: (id: number, form: CustomIndexForm) =>
    api.put<ApiResponse<CustomIndex>>(`/indexes/${id}`, form).then((r) => r.data.data),

  deleteIndex: (id: number) =>
    api.delete<ApiResponse<null>>(`/indexes/${id}`).then((r) => r.data),
};
