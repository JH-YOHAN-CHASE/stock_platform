import FinanceDataReader as fdr
import json
import os

stocks = []
seen = set()

for market in ["KOSPI", "KOSDAQ"]:
    try:
        df = fdr.StockListing(market)
        for _, row in df.iterrows():
            code = str(row.get("Code", "")).strip().zfill(6)
            name = str(row.get("Name", "")).strip()
            if code and name and code not in seen:
                seen.add(code)
                en = str(row.get("Symbol", "")).strip() or str(row.get("Code", "")).strip()
                entry = {"code": code, "ko": name}
                if en and en != code:
                    entry["en"] = en.upper()
                stocks.append(entry)
        print(f"{market}: {len(df)}개 로드")
    except Exception as e:
        print(f"{market} 로드 실패: {e}")

output_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "backend", "application", "src", "main", "resources", "stocks.json"
)

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(stocks, f, ensure_ascii=False, indent=2)

print(f"\n완료: 총 {len(stocks)}개 → stocks.json 저장")
