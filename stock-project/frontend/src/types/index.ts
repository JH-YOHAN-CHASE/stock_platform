// ── Auth ─────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  name: string;
  profileImage: string;
  provider: 'GOOGLE' | 'NAVER';
}

// ── Portfolio ─────────────────────────────────────────────────
export interface PortfolioItem {
  id: number;
  ticker: string;
  stockName: string;
  quantity: number;
  avgBuyPrice: number;
  purchaseDate: string;
  weight: number | null;
}

export interface Portfolio {
  id: number;
  userId: number;
  userName: string;
  name: string;
  description: string;
  isPublic: boolean;
  items: PortfolioItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummary {
  id: number;
  userId: number;
  userName: string;
  name: string;
  description: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
}

export interface PortfolioItemForm {
  ticker: string;
  stockName: string;
  quantity: number;
  avgBuyPrice: number;
  purchaseDate: string;
  weight: number | null;
}

export interface PortfolioForm {
  name: string;
  description: string;
  isPublic: boolean;
  items: PortfolioItemForm[];
}

// ── Custom Index ──────────────────────────────────────────────
export type IndicatorType =
  | 'INTEREST_RATE'
  | 'EXCHANGE_RATE'
  | 'OIL_PRICE'
  | 'TARIFF'
  | 'CPI'
  | 'EMPLOYMENT'
  | 'GDP'
  | 'PMI'
  | 'YIELD_CURVE'
  | 'CUSTOM';

export const INDICATOR_LABELS: Record<IndicatorType, string> = {
  INTEREST_RATE: '금리',
  EXCHANGE_RATE: '환율',
  OIL_PRICE: '국제유가',
  TARIFF: '관세',
  CPI: 'CPI (소비자물가)',
  EMPLOYMENT: '고용지표',
  GDP: 'GDP',
  PMI: '구매관리자지수 (PMI)',
  YIELD_CURVE: '장단기 금리차',
  CUSTOM: '사용자 정의',
};

export interface IndexComponent {
  id: number;
  indicatorType: IndicatorType;
  indicatorName: string;
  weight: number;
  direction: 1 | -1;
  description: string;
  dataSourceCode: string;
}

export interface CustomIndex {
  id: number;
  userId: number;
  userName: string;
  name: string;
  description: string;
  isPublic: boolean;
  components: IndexComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomIndexSummary {
  id: number;
  userId: number;
  userName: string;
  name: string;
  description: string;
  isPublic: boolean;
  componentCount: number;
  createdAt: string;
}

export interface IndexComponentForm {
  indicatorType: IndicatorType;
  indicatorName: string;
  weight: number;
  direction: 1 | -1;
  description: string;
  dataSourceCode: string;
}

export interface CustomIndexForm {
  name: string;
  description: string;
  isPublic: boolean;
  components: IndexComponentForm[];
}

// ── API ───────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
