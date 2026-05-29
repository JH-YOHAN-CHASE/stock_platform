package stock.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import stock.dto.BacktestRequestDto;
import stock.dto.BacktestResponseDto;
import stock.entity.Portfolio;
import stock.entity.PortfolioItem;
import stock.repository.PortfolioItemRepository;
import stock.repository.PortfolioRepository;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
@Slf4j
@Service
@RequiredArgsConstructor
public class BacktestService {

    private final PortfolioRepository portfolioRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final MarketDataService marketDataService;
    private final StockResolverService stockResolverService;

    public BacktestResponseDto.Response runBacktest(BacktestRequestDto req, Long userId) {
        Portfolio portfolio = portfolioRepository.findById(req.getPortfolioId())
                .orElseThrow(() -> new IllegalArgumentException("포트폴리오를 찾을 수 없습니다"));

        if (!portfolio.isPublic()) {
            portfolioRepository.findByIdAndUserId(req.getPortfolioId(), userId)
                    .orElseThrow(() -> new SecurityException("접근 권한이 없습니다"));
        }

        List<PortfolioItem> items = portfolioItemRepository.findByPortfolioId(req.getPortfolioId());
        if (items.isEmpty()) throw new IllegalArgumentException("포트폴리오에 종목이 없습니다");

        LocalDate startDate = LocalDate.parse(req.getStartDate());
        LocalDate endDate = LocalDate.parse(req.getEndDate());
        long initialInvestment = req.getInitialInvestment();
        long monthlyAddition = req.getMonthlyAddition();
        String rebalancing = req.getRebalancing() == null ? "NONE" : req.getRebalancing();

        double[] weights = computeWeights(items);

        List<TreeMap<YearMonth, Double>> priceHistory = new ArrayList<>();
        for (PortfolioItem item : items) {
            StockResolverService.ResolvedStock rs = stockResolverService.resolve(item.getTicker());
            if (rs.type() == StockResolverService.StockType.UNKNOWN) {
                log.warn("[Backtest] 인식 불가 종목 '{}' — 해당 종목은 수익률 0%로 처리됩니다", item.getTicker());
                priceHistory.add(new TreeMap<>());
                continue;
            }
            String symbol = rs.type() == StockResolverService.StockType.KOREAN
                    ? rs.ticker() + ".KS" : rs.ticker();
            TreeMap<YearMonth, Double> prices = marketDataService.fetchMonthlyPrices(symbol, startDate, endDate);
            if (prices.isEmpty() && symbol.endsWith(".KS")) {
                prices = marketDataService.fetchMonthlyPrices(symbol.replace(".KS", ".KQ"), startDate, endDate);
            }
            priceHistory.add(prices);
        }

        TreeMap<YearMonth, Double> kospiPrices = marketDataService.fetchMonthlyPrices("^KS11", startDate, endDate);
        TreeMap<YearMonth, Double> sp500Prices = marketDataService.fetchMonthlyPrices("^GSPC", startDate, endDate);

        List<YearMonth> months = buildMonthRange(startDate, endDate);

        // 가격 빈자리 채우기
        for (TreeMap<YearMonth, Double> ph : priceHistory) forwardFill(ph, months);
        forwardFill(kospiPrices, months);
        forwardFill(sp500Prices, months);

        // 1. 내 포트폴리오 시뮬레이션 실행
        List<Double> portfolioValues = simulate(priceHistory, weights, months, initialInvestment, rebalancing, monthlyAddition);

        /*
         * 💡 [수정 구간] 벤치마크 지수 시뮬레이션 도입
         * - 수정 이유: 기존의 수동 누적 원금 계산 방식은 월 적립금 투입 시점의 지수 반영이 수학적으로 왜곡되어 차트 괴리가 발생함.
         * - 해결 방법: 코스피와 S&P500을 '비중 100%짜리 단일 종목 포트폴리오'로 가정하고, 검증된 자산 배분 시뮬레이터(simulate)에 통째로 통과시킴.
         * - 결과: 사용자의 자산과 완벽하게 동일한 조건(초기 자금, 월 적립금, 투자 기간)으로 지수가 굴러가므로 차트 스케일이 완벽히 일치하게 됨.
         */
        List<Double> kospiValues = simulate(Collections.singletonList(kospiPrices), new double[]{1.0}, months, initialInvestment, "NONE", monthlyAddition);
        List<Double> sp500Values = simulate(Collections.singletonList(sp500Prices), new double[]{1.0}, months, initialInvestment, "NONE", monthlyAddition);

        double finalValue = portfolioValues.isEmpty() ? initialInvestment : portfolioValues.get(portfolioValues.size() - 1);
        long totalInvested = initialInvestment + monthlyAddition * Math.max(0, months.size() - 1);
        double years = months.size() / 12.0;
        double totalReturn = (finalValue - totalInvested) / totalInvested * 100;
        double cagr = years > 0 ? (Math.pow(finalValue / (double) totalInvested, 1.0 / years) - 1) * 100 : 0;
        double mdd = calcMdd(portfolioValues);
        double[] volAndSharpe = calcVolatilityAndSharpe(portfolioValues, cagr);

        // 벤치마크 수익률도 포트폴리오와 동일한 기준(총 투자금 대비)으로 계산
        double kospiFinal = kospiValues.isEmpty() ? initialInvestment : kospiValues.get(kospiValues.size() - 1);
        double sp500Final = sp500Values.isEmpty() ? initialInvestment : sp500Values.get(sp500Values.size() - 1);
        double kospiReturn = (kospiFinal - totalInvested) / totalInvested * 100;
        double sp500Return = (sp500Final - totalInvested) / totalInvested * 100;

        BacktestResponseDto.Metrics metrics = new BacktestResponseDto.Metrics(
                round2(totalReturn), round2(cagr), round2(mdd),
                round2(volAndSharpe[0]), round2(volAndSharpe[1]),
                round2(kospiReturn), round2(sp500Return),
                Math.round(finalValue), initialInvestment, totalInvested
        );

        return BacktestResponseDto.Response.builder()
                // 💡 [수정] 수동 계산 수식 대신, 엔진이 계산한 리스트(kospiValues, sp500Values)를 인자로 깔끔하게 전달
                .chartData(buildChartData(months, portfolioValues, kospiValues, sp500Values))
                .metrics(metrics)
                .yearlyReturns(calcYearlyReturns(months, portfolioValues, kospiPrices, sp500Prices))
                .build();
    }

    private double[] computeWeights(List<PortfolioItem> items) {
        double[] w = new double[items.size()];
        double total = items.stream()
                .mapToDouble(i -> i.getWeight() != null ? i.getWeight().doubleValue() : 0)
                .sum();
        if (total > 0.1) {
            for (int i = 0; i < items.size(); i++)
                w[i] = (items.get(i).getWeight() != null ? items.get(i).getWeight().doubleValue() : 0) / total;
        } else {
            Arrays.fill(w, 1.0 / items.size());
        }
        return w;
    }

    private List<YearMonth> buildMonthRange(LocalDate start, LocalDate end) {
        List<YearMonth> months = new ArrayList<>();
        YearMonth s = YearMonth.from(start), e = YearMonth.from(end);
        while (!s.isAfter(e)) { months.add(s); s = s.plusMonths(1); }
        return months;
    }

    private void forwardFill(TreeMap<YearMonth, Double> prices, List<YearMonth> months) {
        if (prices.isEmpty()) return;
        Double last = prices.firstEntry().getValue();
        for (YearMonth m : months) {
            if (prices.containsKey(m)) {
                last = prices.get(m);
            } else {
                prices.put(m, last);
            }
        }
    }

    private List<Double> simulate(List<TreeMap<YearMonth, Double>> priceHistory, double[] weights,
                                  List<YearMonth> months, long initialInvestment, String rebalancing, long monthlyAddition) {
        List<Double> values = new ArrayList<>();
        int n = priceHistory.size();
        double[] currentSharesVal = new double[n];
        double[] lastPrices = new double[n];

        // 1개월 차 (초기 투자)
        YearMonth startMonth = months.get(0);
        for (int i = 0; i < n; i++) {
            currentSharesVal[i] = initialInvestment * weights[i];
            lastPrices[i] = priceHistory.get(i).getOrDefault(startMonth, 0.0);
        }
        values.add((double) initialInvestment);

        // 2개월 차부터 시뮬레이션
        for (int mi = 1; mi < months.size(); mi++) {
            YearMonth m = months.get(mi);
            double currentTotal = 0;
            double[] curPrices = new double[n];

            // 1. 가격 변동 적용
            for (int i = 0; i < n; i++) {
                curPrices[i] = priceHistory.get(i).getOrDefault(m, lastPrices[i]);
                if (lastPrices[i] > 0 && curPrices[i] > 0) {
                    currentSharesVal[i] = currentSharesVal[i] * (curPrices[i] / lastPrices[i]);
                }
                currentTotal += currentSharesVal[i];
            }

            // 2. 월 적립금 추가
            if (monthlyAddition > 0) {
                for (int i = 0; i < n; i++) {
                    currentSharesVal[i] += monthlyAddition * weights[i];
                }
                currentTotal += monthlyAddition;
            }

            // 3. 리밸런싱 트리거 검사 및 실행
            int mv = m.getMonthValue();
            boolean rebal = "QUARTERLY".equals(rebalancing) && (mv == 1 || mv == 4 || mv == 7 || mv == 10);
            rebal = rebal || ("ANNUALLY".equals(rebalancing) && mv == 1);

            if (rebal) {
                for (int i = 0; i < n; i++) {
                    currentSharesVal[i] = currentTotal * weights[i];
                }
            }

            // 4. 다음 달을 위해 현재 가격 저장
            for (int i = 0; i < n; i++) {
                lastPrices[i] = curPrices[i];
            }

            values.add(currentTotal);
        }
        return values;
    }

    /*
     * 💡 [수정 구간] buildChartData 매개변수 및 매핑 로직 단순화
     * - 수정 이유: 더 이상 복잡하고 버그가 일어나기 쉬운 '지수 가치 환산 수식'을 이 안에서 계산할 필요가 없어짐.
     * - 결과: 계산이 완료된 리스트를 가져와서 `Math.round()` 처리 후 데이터 포인트에 꽂아주기만 하면 끝남.
     * 가독성이 극대화되고 연산 속도가 빨라짐.
     */
    private List<BacktestResponseDto.ChartPoint> buildChartData(List<YearMonth> months,
                                                                List<Double> portfolioValues,
                                                                List<Double> kospiValues,
                                                                List<Double> sp500Values) {
        List<BacktestResponseDto.ChartPoint> chart = new ArrayList<>();

        for (int i = 0; i < months.size(); i++) {
            YearMonth m = months.get(i);
            long pv = Math.round(portfolioValues.get(i));
            long kv = Math.round(kospiValues.get(i));
            long sv = Math.round(sp500Values.get(i));

            chart.add(new BacktestResponseDto.ChartPoint(m.toString(), pv, kv, sv));
        }
        return chart;
    }

    private double calcMdd(List<Double> values) {
        double peak = values.isEmpty() ? 0 : values.get(0);
        double mdd = 0;
        for (double v : values) {
            if (v > peak) peak = v;
            if (peak > 0) mdd = Math.max(mdd, (peak - v) / peak * 100);
        }
        return mdd;
    }

    private double[] calcVolatilityAndSharpe(List<Double> values, double cagr) {
        if (values.size() < 2) return new double[]{0, 0};
        List<Double> returns = new ArrayList<>();
        for (int i = 1; i < values.size(); i++)
            if (values.get(i - 1) > 0)
                returns.add((values.get(i) - values.get(i - 1)) / values.get(i - 1));
        if (returns.isEmpty()) return new double[]{0, 0};
        double mean = returns.stream().mapToDouble(d -> d).average().orElse(0);
        double variance = returns.stream().mapToDouble(r -> (r - mean) * (r - mean)).average().orElse(0);
        double vol = Math.sqrt(variance) * Math.sqrt(12) * 100;
        double sharpe = vol > 0 ? (cagr - 3.5) / vol : 0;
        return new double[]{vol, sharpe};
    }

    private List<BacktestResponseDto.YearlyReturn> calcYearlyReturns(List<YearMonth> months, List<Double> portfolioValues,
                                                                     TreeMap<YearMonth, Double> kospiPrices, TreeMap<YearMonth, Double> sp500Prices) {
        List<BacktestResponseDto.YearlyReturn> result = new ArrayList<>();
        Map<Integer, List<Integer>> byYear = new LinkedHashMap<>();
        for (int i = 0; i < months.size(); i++)
            byYear.computeIfAbsent(months.get(i).getYear(), k -> new ArrayList<>()).add(i);

        for (Map.Entry<Integer, List<Integer>> entry : byYear.entrySet()) {
            int year = entry.getKey();
            List<Integer> idx = entry.getValue();
            int fi = idx.get(0), li = idx.get(idx.size() - 1);

            double ps = portfolioValues.get(fi), pe = portfolioValues.get(li);
            double portRet = ps > 0 ? (pe - ps) / ps * 100 : 0;

            YearMonth fm = months.get(fi), lm = months.get(li);
            Double ks = kospiPrices.get(fm), ke = kospiPrices.get(lm);
            double kospiRet = (ks != null && ks > 0 && ke != null) ? (ke - ks) / ks * 100 : 0;
            Double ss = sp500Prices.get(fm), se = sp500Prices.get(lm);
            double sp500Ret = (ss != null && ss > 0 && se != null) ? (se - ss) / ss * 100 : 0;

            result.add(new BacktestResponseDto.YearlyReturn(year, round2(portRet), round2(kospiRet), round2(sp500Ret)));
        }
        return result;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}