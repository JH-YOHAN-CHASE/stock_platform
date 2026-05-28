import FinanceDataReader as fdr
import json
import os

output_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "backend", "application", "src", "main", "resources", "us_stocks.json"
)

# 기존 us_stocks.json에서 ko 매핑 보존
existing_ko = {}
if os.path.exists(output_path):
    with open(output_path, "r", encoding="utf-8") as f:
        for entry in json.load(f):
            if entry.get("ko"):
                existing_ko[entry["ticker"].upper()] = entry["ko"]

stocks = []
seen = set()

df = fdr.StockListing('NASDAQ')
print(f"컬럼: {list(df.columns)}")

for _, row in df.iterrows():
    ticker = str(row.get("Symbol") or row.get("Code") or "").strip().upper()
    name = str(row.get("Name") or row.get("OfficialName") or "").strip()
    if not ticker or not name or ticker in seen:
        continue
    seen.add(ticker)
    entry = {"ticker": ticker, "name": name}
    if ticker in existing_ko:
        entry["ko"] = existing_ko[ticker]
    stocks.append(entry)

print(f"나스닥: {len(stocks)}개 로드")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(stocks, f, ensure_ascii=False, indent=2)

print(f"\n완료: 총 {len(stocks)}개 → us_stocks.json 저장")
