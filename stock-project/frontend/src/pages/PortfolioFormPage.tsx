import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { portfolioApi } from '../api/portfolio';
import type { PortfolioForm, PortfolioItemForm } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './FormPage.module.css';

const EMPTY_ITEM: PortfolioItemForm = {
    ticker: '', stockName: '', quantity: 1, avgBuyPrice: 0, purchaseDate: '', weight: null,
};

// 💡 [추가] 비중 자동 계산 도우미 함수
const recalculateWeights = (items: PortfolioItemForm[]): PortfolioItemForm[] => {
    // 전체 총 매수금액 계산
    const totalValue = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.avgBuyPrice) || 0)), 0);

    // 총액이 0이면 비중을 모두 초기화
    if (totalValue === 0) {
        return items.map(item => ({ ...item, weight: null }));
    }

    // 각 아이템별 비중 계산 (소수점 2자리)
    return items.map(item => {
        const itemValue = (Number(item.quantity) || 0) * (Number(item.avgBuyPrice) || 0);
        return {
            ...item,
            weight: Number(((itemValue / totalValue) * 100).toFixed(2))
        };
    });
};

export default function PortfolioFormPage() {
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<PortfolioForm>({
        name: '', description: '', isPublic: false, items: [{ ...EMPTY_ITEM }],
    });

    useEffect(() => {
        if (isEdit) {
            portfolioApi.getPortfolio(Number(id)).then((p) => {
                setForm({
                    name: p.name,
                    description: p.description ?? '',
                    isPublic: p.isPublic,
                    items: p.items.map((i) => ({
                        ticker: i.ticker, stockName: i.stockName,
                        quantity: i.quantity, avgBuyPrice: i.avgBuyPrice,
                        purchaseDate: i.purchaseDate ?? '', weight: i.weight,
                    })),
                });
            });
        }
    }, [id]);

    const setField = <K extends keyof PortfolioForm>(k: K, v: PortfolioForm[K]) =>
        setForm((prev) => ({ ...prev, [k]: v }));

    // 💡 [수정] 수량이나 평균단가가 바뀔 때 비중 재계산
    const setItem = (idx: number, k: keyof PortfolioItemForm, v: string | number | null) =>
        setForm((prev) => {
            let items = [...prev.items];
            items[idx] = { ...items[idx], [k]: v };

            // 가격이나 수량이 변경되었다면 전체 비중 다시 계산
            if (k === 'quantity' || k === 'avgBuyPrice') {
                items = recalculateWeights(items);
            }

            return { ...prev, items };
        });

    const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));

    // 💡 [수정] 종목을 삭제할 때도 남은 종목들의 비중 재계산
    const removeItem = (idx: number) =>
        setForm((prev) => {
            let items = prev.items.filter((_, i) => i !== idx);
            items = recalculateWeights(items);
            return { ...prev, items };
        });

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

    // 총 매수금액을 화면에 보여주기 위해 렌더링 시 계산
    const totalInvestment = form.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.avgBuyPrice) || 0)), 0);

    return (
        <div>
            <PageHeader
                title={isEdit ? '포트폴리오 수정' : '포트폴리오 만들기'}
                subtitle="종목을 추가해 나만의 포트폴리오를 구성하세요"
            />

            <div className={styles.layout}>
                {/* 기본 정보 */}
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

                {/* 종목 목록 */}
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
                                <div className={styles.field}>
                                    <label>종목코드 *</label>
                                    <input className={styles.input} value={item.ticker} onChange={(e) => setItem(idx, 'ticker', e.target.value.toUpperCase())} placeholder="AAPL / 005930" />
                                </div>
                                <div className={styles.field}>
                                    <label>종목명 *</label>
                                    <input className={styles.input} value={item.stockName} onChange={(e) => setItem(idx, 'stockName', e.target.value)} placeholder="Apple Inc." />
                                </div>
                                <div className={styles.field}>
                                    <label>수량 *</label>
                                    <input className={styles.input} type="number" min={1} value={item.quantity} onChange={(e) => setItem(idx, 'quantity', Number(e.target.value))} />
                                </div>
                                <div className={styles.field}>
                                    <label>평균단가 *</label>
                                    <input className={styles.input} type="number" min={0} step="0.01" value={item.avgBuyPrice} onChange={(e) => setItem(idx, 'avgBuyPrice', Number(e.target.value))} />
                                </div>
                                <div className={styles.field}>
                                    <label>매수일</label>
                                    <input className={styles.input} type="date" value={item.purchaseDate} onChange={(e) => setItem(idx, 'purchaseDate', e.target.value)} />
                                </div>

                                {/* 💡 [수정] 비중 입력칸을 자동 계산된 값을 보여주기만 하는 비활성화(readonly) 칸으로 변경 */}
                                <div className={styles.field}>
                                    <label>비중 (%) <span style={{fontSize: '0.75rem', color: '#999'}}>(자동계산)</span></label>
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

                {/* Actions */}
                <div className={styles.actions}>
                    <Button variant="secondary" onClick={() => navigate(-1)}>취소</Button>
                    <Button onClick={handleSubmit} loading={saving}>{isEdit ? '저장' : '포트폴리오 생성'}</Button>
                </div>
            </div>
        </div>
    );
}