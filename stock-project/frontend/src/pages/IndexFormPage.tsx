import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { indexApi } from '../api/index';
import type { CustomIndexForm, IndexComponentForm, IndicatorType } from '../types';
import { INDICATOR_LABELS } from '../types';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import styles from './FormPage.module.css';

const EMPTY_COMPONENT: IndexComponentForm = {
  indicatorType: 'INTEREST_RATE',
  indicatorName: '',
  weight: 0,
  direction: 1,
  description: '',
  dataSourceCode: '',
};

export default function IndexFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CustomIndexForm>({
    name: '', description: '', isPublic: false,
    components: [{ ...EMPTY_COMPONENT }],
  });

  useEffect(() => {
    if (isEdit) {
      indexApi.getIndex(Number(id)).then((idx) => {
        setForm({
          name: idx.name,
          description: idx.description ?? '',
          isPublic: idx.isPublic,
          components: idx.components.map((c) => ({
            indicatorType: c.indicatorType,
            indicatorName: c.indicatorName,
            weight: Number(c.weight),
            direction: c.direction as 1 | -1,
            description: c.description ?? '',
            dataSourceCode: c.dataSourceCode ?? '',
          })),
        });
      });
    }
  }, [id]);

  const setField = <K extends keyof CustomIndexForm>(k: K, v: CustomIndexForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setComp = (idx: number, k: keyof IndexComponentForm, v: unknown) =>
    setForm((p) => {
      const components = [...p.components];
      components[idx] = { ...components[idx], [k]: v };
      return { ...p, components };
    });

  const addComp = () =>
    setForm((p) => ({ ...p, components: [...p.components, { ...EMPTY_COMPONENT }] }));

  const removeComp = (idx: number) =>
    setForm((p) => ({ ...p, components: p.components.filter((_, i) => i !== idx) }));

  const totalWeight = form.components.reduce((s, c) => s + Number(c.weight || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert('지수 이름을 입력하세요');
    if (!weightOk) return alert(`가중치 합계가 100%여야 합니다. (현재: ${totalWeight.toFixed(2)}%)`);
    setSaving(true);
    try {
      if (isEdit) {
        await indexApi.updateIndex(Number(id), form);
        navigate(`/indexes/${id}`, { replace: true });
      } else {
        const created = await indexApi.createIndex(form);
        navigate(`/indexes/${created.id}`, { replace: true });
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? '지수 수정' : '나만의 지수 만들기'}
        subtitle="경제 지표를 조합해 나만의 투자 지수를 설계하세요"
      />

      <div className={styles.layout}>
        {/* 기본 정보 */}
        <Card>
          <h3 className={styles.cardTitle}>기본 정보</h3>
          <div className={styles.field}>
            <label>지수 이름 *</label>
            <input className={styles.input} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="예: 나만의 경기침체 지수" />
          </div>
          <div className={styles.field}>
            <label>설명</label>
            <textarea className={styles.textarea} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="이 지수가 무엇을 측정하는지 설명하세요" rows={3} />
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

        {/* 지표 구성 */}
        <Card>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>지표 구성</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={`${styles.weightTotal} ${weightOk ? styles.weightOk : styles.weightErr}`}>
                합계: {totalWeight.toFixed(1)}% {weightOk ? '✓' : '(100%가 되어야 합니다)'}
              </span>
              <Button variant="secondary" size="sm" onClick={addComp}>＋ 지표 추가</Button>
            </div>
          </div>

          {/* 전체 가중치 바 */}
          <div className={styles.weightBar} style={{ marginBottom: 20 }}>
            <div className={styles.weightBarFill} style={{ width: `${Math.min(totalWeight, 100)}%` }} />
          </div>

          {form.components.map((comp, idx) => (
            <div key={idx} className={styles.componentRow}>
              <div className={styles.componentHeader}>
                <span className={styles.componentIndex}>지표 #{idx + 1}</span>
                {form.components.length > 1 && (
                  <button className={styles.removeBtn} onClick={() => removeComp(idx)}>✕</button>
                )}
              </div>
              <div className={styles.componentGrid}>
                <div className={styles.field}>
                  <label>지표 유형 *</label>
                  <select
                    className={styles.select}
                    value={comp.indicatorType}
                    onChange={(e) => {
                      const t = e.target.value as IndicatorType;
                      setComp(idx, 'indicatorType', t);
                      if (t !== 'CUSTOM') setComp(idx, 'indicatorName', INDICATOR_LABELS[t]);
                    }}
                  >
                    {(Object.keys(INDICATOR_LABELS) as IndicatorType[]).map((k) => (
                      <option key={k} value={k}>{INDICATOR_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>지표명 *</label>
                  <input
                    className={styles.input}
                    value={comp.indicatorName}
                    onChange={(e) => setComp(idx, 'indicatorName', e.target.value)}
                    placeholder="예: 미국 기준금리"
                  />
                </div>
                <div className={styles.field}>
                  <label>가중치 (%) *</label>
                  <input
                    className={styles.input}
                    type="number" min={0} max={100} step="0.01"
                    value={comp.weight}
                    onChange={(e) => setComp(idx, 'weight', Number(e.target.value))}
                  />
                </div>
                <div className={styles.field}>
                  <label>상관 방향 *</label>
                  <div className={styles.directionGroup}>
                    <button
                      className={`${styles.dirBtn} ${styles.dirBtnPos} ${comp.direction === 1 ? styles.active : ''}`}
                      onClick={() => setComp(idx, 'direction', 1)}
                      type="button"
                    >↑ 양의 상관</button>
                    <button
                      className={`${styles.dirBtn} ${styles.dirBtnNeg} ${comp.direction === -1 ? styles.active : ''}`}
                      onClick={() => setComp(idx, 'direction', -1)}
                      type="button"
                    >↓ 음의 상관</button>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>설명</label>
                  <input
                    className={styles.input}
                    value={comp.description}
                    onChange={(e) => setComp(idx, 'description', e.target.value)}
                    placeholder="이 지표의 역할"
                  />
                </div>
                <div className={styles.field}>
                  <label>데이터 소스 코드</label>
                  <input
                    className={styles.input}
                    value={comp.dataSourceCode}
                    onChange={(e) => setComp(idx, 'dataSourceCode', e.target.value)}
                    placeholder="예: FEDFUNDS (FRED API)"
                  />
                </div>
              </div>
            </div>
          ))}
        </Card>

        {/* 저장 버튼 */}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate(-1)}>취소</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!weightOk}>
            {isEdit ? '저장' : '지수 생성'}
          </Button>
        </div>
      </div>
    </div>
  );
}
