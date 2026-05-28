import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { portfolioApi } from '../api/portfolio';
import { marketApi } from '../api/market';
import type { PortfolioForm, PortfolioItemForm } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './FormPage.module.css';

type StockResult = { ticker: string; name: string; type: string };

const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyItem = (): PortfolioItemForm => ({
    ticker: '', stockName: '', quantity: 1, avgBuyPrice: 0, purchaseDate: getToday(), weight: null,
});

const recalculateWeights = (items: PortfolioItemForm[]): PortfolioItemForm[] => {
    const totalValue = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.avgBuyPrice) || 0)), 0);
    if (totalValue === 0) return items.map(item => ({ ...item, weight: null }));
    return items.map(item => {
        const itemValue = (Number(item.quantity) || 0) * (Number(item.avgBuyPrice) || 0);
        return { ...item, weight: Number(((itemValue / totalValue) * 100).toFixed(2)) };
    });
};

export default function PortfolioFormPage() {
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<PortfolioForm>({
        name: '', description: '', isPublic: false, items: [emptyItem()],
    });
    const [priceLoading, setPriceLoading] = useState<boolean[]>([false]);
    const [usdPrices, setUsdPrices] = useState<(number | null)[]>([null]);
    const [searchInputs, setSearchInputs] = useState<string[]>(['']);
    const [searchResults, setSearchResults] = useState<StockResult[][]>([[]]);
    const [showDropdowns, setShowDropdowns] = useState<boolean[]>([false]);
    const formRef = useRef(form);
    const tickerTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
    const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    useEffect(() => { formRef.current = form; }, [form]);

    useEffect(() => {
        if (isEdit) {
            portfolioApi.getPortfolio(Number(id)).then((p) => {
                setForm({
                    name: p.name,
                    description: p.description ?? '',
                    isPublic: p.isPublic,
                    items: p.items.map((i) => ({
                        ticker: i.ticker,
                        stockName: i.stockName,
                        quantity: i.quantity,
                        avgBuyPrice: i.avgBuyPrice,
                        purchaseDate: i.purchaseDate ?? getToday(),
                        weight: i.weight,
                    })),
                });
                setPriceLoading(new Array(p.items.length).fill(false));
                setUsdPrices(new Array(p.items.length).fill(null));
                setSearchInputs(p.items.map(i => i.stockName ? `${i.stockName} (${i.ticker})` : i.ticker));
                setSearchResults(new Array(p.items.length).fill([]));
                setShowDropdowns(new Array(p.items.length).fill(false));
            });
        }
    }, [id]);

    const setField = <K extends keyof PortfolioForm>(k: K, v: PortfolioForm[K]) =>
        setForm((prev) => ({ ...prev, [k]: v }));

    const setItem = (idx: number, k: keyof PortfolioItemForm, v: string | number | null) =>
        setForm((prev) => {
            let items = [...prev.items];
            items[idx] = { ...items[idx], [k]: v };
            if (k === 'quantity' || k === 'avgBuyPrice') {
                items = recalculateWeights(items);
            }
            return { ...prev, items };
        });

    const fetchAndFillPrice = async (idx: number, ticker: string, date: string) => {
        setPriceLoading(prev => { const n = [...prev]; n[idx] = true; return n; });
        try {
            let resolvedTicker = ticker;
            let isUs = false;
            try {
                const resolved = await marketApi.resolveStock(ticker);
                resolvedTicker = resolved.ticker;
                isUs = resolved.type === 'US';
                setForm((prev) => {
                    const items = [...prev.items];
                    const cur = items[idx];
                    const nameIsEmpty = !cur.stockName || cur.stockName.toUpperCase() === ticker.toUpperCase();
                    items[idx] = {
                        ...cur,
                        ticker: resolved.ticker,
                        ...(nameIsEmpty ? { stockName: resolved.name } : {}),
                    };
                    return { ...prev, items };
                });
            } catch { /* resolve 실패 시 원래 ticker 사용 */ }

            const price = date
                ? await marketApi.getStockPriceByDate(resolvedTicker, date)
                : await marketApi.getStockPrice(resolvedTicker);
            if (price > 0) {
                setForm((prev) => {
                    let items = [...prev.items];
                    items[idx] = { ...items[idx], avgBuyPrice: price };
                    items = recalculateWeights(items);
                    return { ...prev, items };
                });
            }

            if (isUs) {
                try {
                    const rawUsd = date
                        ? await marketApi.getRawPrice(resolvedTicker, date)
                        : await marketApi.getRawPrice(resolvedTicker);
                    setUsdPrices(prev => { const n = [...prev]; n[idx] = rawUsd > 0 ? rawUsd : null; return n; });
                } catch {
                    setUsdPrices(prev => { const n = [...prev]; n[idx] = null; return n; });
                }
            } else {
                setUsdPrices(prev => { const n = [...prev]; n[idx] = null; return n; });
            }
        } catch {
            // API 실패 시 조용히 무시
        } finally {
            setPriceLoading(prev => { const n = [...prev]; n[idx] = false; return n; });
        }
    };

    const handleStockSearch = (idx: number, value: string) => {
        setSearchInputs(prev => { const n = [...prev]; n[idx] = value; return n; });
        setForm((prev) => {
            const items = [...prev.items];
            items[idx] = { ...items[idx], ticker: '', stockName: '' };
            return { ...prev, items };
        });

        if (searchTimers.current[idx]) clearTimeout(searchTimers.current[idx]);
        if (tickerTimers.current[idx]) clearTimeout(tickerTimers.current[idx]);

        if (!value.trim()) {
            setSearchResults(prev => { const n = [...prev]; n[idx] = []; return n; });
            setShowDropdowns(prev => { const n = [...prev]; n[idx] = false; return n; });
            return;
        }

        searchTimers.current[idx] = setTimeout(async () => {
            try {
                const results = await marketApi.searchStocks(value);
                setSearchResults(prev => { const n = [...prev]; n[idx] = results; return n; });
                setShowDropdowns(prev => { const n = [...prev]; n[idx] = results.length > 0; return n; });
            } catch {
                setSearchResults(prev => { const n = [...prev]; n[idx] = []; return n; });
            }
        }, 300);
    };

    const handleStockSelect = (idx: number, ticker: string, name: string) => {
        setSearchInputs(prev => { const n = [...prev]; n[idx] = `${name} (${ticker})`; return n; });
        setShowDropdowns(prev => { const n = [...prev]; n[idx] = false; return n; });
        setForm((prev) => {
            const items = [...prev.items];
            items[idx] = { ...items[idx], ticker, stockName: name };
            return { ...prev, items };
        });
        const date = formRef.current.items[idx]?.purchaseDate ?? '';
        fetchAndFillPrice(idx, ticker, date);
    };

    const handleDateChange = (idx: number, date: string) => {
        setItem(idx, 'purchaseDate', date);
        const ticker = formRef.current.items[idx]?.ticker ?? '';
        if (ticker && date) {
            fetchAndFillPrice(idx, ticker, date);
        }
    };

    const addItem = () => {
        setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
        setPriceLoading(prev => [...prev, false]);
        setUsdPrices(prev => [...prev, null]);
        setSearchInputs(prev => [...prev, '']);
        setSearchResults(prev => [...prev, []]);
        setShowDropdowns(prev => [...prev, false]);
    };

    const removeItem = (idx: number) => {
        setForm((prev) => {
            let items = prev.items.filter((_, i) => i !== idx);
            items = recalculateWeights(items);
            return { ...prev, items };
        });
        setPriceLoading(prev => prev.filter((_, i) => i !== idx));
        setUsdPrices(prev => prev.filter((_, i) => i !== idx));
        setSearchInputs(prev => prev.filter((_, i) => i !== idx));
        setSearchResults(prev => prev.filter((_, i) => i !== idx));
        setShowDropdowns(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('포트폴리오 이름을 입력하세요');
        if (form.items.length === 0) return alert('종목을 1개 이상 추가하세요');
        setSaving(true);
        try {
            if (isEdit) {
                await portfolioApi.updatePortfolio(Number(id), form);
            } else {
                const created = await portfolioApi.createPortfolio(form);
                navigate(`/portfolios/${created.id}`, { replace: true });
                return;
            }
            navigate(`/portfolios/${id}`, { replace: true });
        } finally {
            setSaving(false);
        }
    };

    const totalInvestment = form.items.reduce(
        (sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.avgBuyPrice) || 0)), 0
    );

    return (
        <div>
            <PageHeader
                title={isEdit ? '포트폴리오 수정' : '포트폴리오 만들기'}
                subtitle="종목을 추가해 나만의 포트폴리오를 구성하세요"
            />

            <div className={styles.layout}>
                <Card>
                    <h3 className={styles.cardTitle}>기본 정보</h3>
                    <div className={styles.field}>
                        <label>포트폴리오 이름 *</label>
                        <input className={styles.input} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="예: 성장주 포트폴리오" />
                    </div>
                    <div className={styles.field}>
                        <label>설명</label>
                        <textarea className={styles.textarea} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="포트폴리오 설명을 입력하세요" rows={3} />
                    </div>
                    <div className={styles.toggleField}>
                        <label>공개 여부</label>
                        <div className={styles.toggle} onClick={() => setField('isPublic', !form.isPublic)}>
                            <div className={`${styles.toggleTrack} ${form.isPublic ? styles.toggleOn : ''}`}>
                                <div className={styles.toggleThumb} />
                            </div>
                            <span>{form.isPublic ? '공개 (다른 사람이 볼 수 있음)' : '비공개'}</span>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className={styles.cardTitleRow}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
                            <h3 className={styles.cardTitle} style={{ margin: 0 }}>종목 목록</h3>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text2)', fontWeight: 'bold' }}>
                                총 투자 금액: {totalInvestment.toLocaleString()}원
                            </span>
                        </div>
                        <Button variant="secondary" size="sm" onClick={addItem}>＋ 종목 추가</Button>
                    </div>

                    {form.items.map((item, idx) => (
                        <div key={idx} className={styles.itemRow}>
                            <div className={styles.itemRowHeader}>
                                <span className={styles.itemIndex}>#{idx + 1}</span>
                                {form.items.length > 1 && (
                                    <button className={styles.removeBtn} onClick={() => removeItem(idx)}>✕</button>
                                )}
                            </div>
                            <div className={styles.itemGrid}>
                                <div className={styles.field} style={{ gridColumn: 'span 2', position: 'relative' }}>
                                    <label>종목 검색 *</label>
                                    <div className={styles.searchWrapper}>
                                        <input
                                            className={styles.input}
                                            value={searchInputs[idx] ?? ''}
                                            onChange={(e) => handleStockSearch(idx, e.target.value)}
                                            onFocus={() => {
                                                if ((searchResults[idx]?.length ?? 0) > 0) {
                                                    setShowDropdowns(prev => { const n = [...prev]; n[idx] = true; return n; });
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => {
                                                setShowDropdowns(prev => { const n = [...prev]; n[idx] = false; return n; });
                                            }, 150)}
                                            placeholder="종목코드, 종목명, 티커 입력 (예: 삼성전자, 005930, AAPL)"
                                        />
                                        {showDropdowns[idx] && (searchResults[idx]?.length ?? 0) > 0 && (
                                            <div className={styles.dropdown}>
                                                {searchResults[idx].map((result, i) => (
                                                    <div
                                                        key={i}
                                                        className={styles.dropdownItem}
                                                        onMouseDown={() => handleStockSelect(idx, result.ticker, result.name)}
                                                    >
                                                        <span>{result.name}</span>
                                                        <span className={styles.dropdownBadge}>
                                                            <span>{result.ticker}</span>
                                                            <span style={{ color: result.type === 'KOREAN' ? 'var(--accent)' : 'var(--accent2)' }}>
                                                                {result.type === 'KOREAN' ? 'KR' : 'US'}
                                                            </span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.field}>
                                    <label>수량 *</label>
                                    <input
                                        className={styles.input}
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(e) => setItem(idx, 'quantity', Number(e.target.value))}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label>
                                        평균단가 *
                                        {priceLoading[idx] && (
                                            <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--accent)' }}>조회 중...</span>
                                        )}
                                    </label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        inputMode="numeric"
                                        value={item.avgBuyPrice > 0
                                            ? Number(item.avgBuyPrice).toLocaleString('ko-KR') + ' 원' +
                                              (usdPrices[idx] != null ? ` ($${Number(usdPrices[idx]).toFixed(2)})` : '')
                                            : ''}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                            setItem(idx, 'avgBuyPrice', raw ? Number(raw) : 0);
                                        }}
                                        disabled={priceLoading[idx]}
                                        style={priceLoading[idx] ? { opacity: 0.6 } : undefined}
                                        placeholder="종목 선택 시 자동 조회"
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label>매수일</label>
                                    <input
                                        className={styles.input}
                                        type="date"
                                        value={item.purchaseDate}
                                        onChange={(e) => handleDateChange(idx, e.target.value)}
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label>비중 (%)</label>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        readOnly
                                        disabled
                                        style={{ backgroundColor: 'var(--bg2)', color: 'var(--text2)', cursor: 'not-allowed' }}
                                        value={item.weight != null ? `${item.weight}%` : '0%'}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </Card>

                <div className={styles.actions}>
                    <Button variant="secondary" onClick={() => navigate(-1)}>취소</Button>
                    <Button onClick={handleSubmit} loading={saving}>{isEdit ? '저장' : '포트폴리오 생성'}</Button>
                </div>
            </div>
        </div>
    );
}
