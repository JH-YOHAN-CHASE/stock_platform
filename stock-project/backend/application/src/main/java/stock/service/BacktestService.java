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
        for (TreeMap<YearMonth, Double> ph : priceHistory) forwardFill(ph, months);
        forwardFill(kospiPrices, months);
        forwardFill(sp500Prices, months);

        List<Double> portfolioValues = simulate(priceHistory, weights, months, initialInvestment, rebalancing, monthlyAddition);

        double finalValue = portfolioValues.isEmpty() ? initialInvestment : portfolioValues.get(portfolioValues.size() - 1);
        long totalInvested = initialInvestment + monthlyAddition * Math.max(0, months.size() - 1);
        double years = months.size() / 12.0;
        double totalReturn = (finalValue - totalInvested) / totalInvested * 100;
        double cagr = years > 0 ? (Math.pow(finalValue / (double) totalInvested, 1.0 / years) - 1) * 100 : 0;
        double mdd = calcMdd(portfolioValues);
        double[] volAndSharpe = calcVolatilityAndSharpe(portfolioValues, cagr);
        double kospiReturn = calcBenchmarkReturn(kospiPrices, months);
        double sp500Return = calcBenchmarkReturn(sp500Prices, months);

        BacktestResponseDto.Metrics metrics = new BacktestResponseDto.Metrics(
                round2(totalReturn), round2(cagr), round2(mdd),
                round2(volAndSharpe[0]), round2(volAndSharpe[1]),
                round2(kospiReturn), round2(sp500Return),
                Math.round(finalValue), initialInvestment, totalInvested
        );

        return BacktestResponseDto.Response.builder()
                .chartData(buildChartData(months, portfolioValues, kospiPrices, sp500Prices, initialInvestment))
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
        Double last = null;
        for (YearMonth m : months) {
            if (prices.containsKey(m)) last = prices.get(m);
            else if (last != null) prices.put(m, last);
        }
    }

    private List<Double> simulate(List<TreeMap<YearMonth, Double>> priceHistory, double[] weights,
                                   List<YearMonth> months, long initialInvestment, String rebalancing, long monthlyAddition) {
        List<Double> values = new ArrayList<>();
        int n = priceHistory.size();
        double[] refAlloc = new double[n];
        double[] refPrices = new double[n];

        YearMonth startMonth = months.get(0);
        for (int i = 0; i < n; i++) {
            refAlloc[i] = initialInvestment * weights[i];
            refPrices[i] = priceHistory.get(i).getOrDefault(startMonth, 0.0);
        }

        for (int mi = 0; mi < months.size(); mi++) {
            YearMonth m = months.get(mi);

            if (mi > 0) {
                double[] curPrices = new double[n];
                for (int i = 0; i < n; i++)
                    curPrices[i] = priceHistory.get(i).getOrDefault(m, refPrices[i]);

                // 리밸런싱
                int mv = m.getMonthValue();
                boolean rebal = "QUARTERLY".equals(rebalancing) && (mv == 1 || mv == 4 || mv == 7 || mv == 10);
                rebal = rebal || ("ANNUALLY".equals(rebalancing) && mv == 1);

                if (rebal) {
                    double cur = 0;
                    for (int i = 0; i < n; i++)
                        cur += refPrices[i] > 0 ? refAlloc[i] * curPrices[i] / refPrices[i] : refAlloc[i];
                    for (int i = 0; i < n; i++) {
                        refAlloc[i] = cur * weights[i];
                        refPrices[i] = curPrices[i];
                    }
                }

                // 월 적립 — 현재 가격에 목표 비중대로 추가 매수
                if (monthlyAddition > 0) {
                    for (int i = 0; i < n; i++) {
                        double curVal = refPrices[i] > 0 ? refAlloc[i] * curPrices[i] / refPrices[i] : refAlloc[i];
                        refAlloc[i] = curVal + monthlyAddition * weights[i];
                        refPrices[i] = curPrices[i];
                    }
                }
            }

            double total = 0;
            for (int i = 0; i < n; i++) {
                double p = priceHistory.get(i).getOrDefault(m, refPrices[i]);
                total += refPrices[i] > 0 ? refAlloc[i] * p / refPrices[i] : refAlloc[i];
            }
            values.add(total);
        }
        return values;
    }

    private List<BacktestResponseDto.ChartPoint> buildChartData(List<YearMonth> months, List<Double> portfolioValues,
            TreeMap<YearMonth, Double> kospiPrices, TreeMap<YearMonth, Double> sp500Prices, long initialInvestment) {
        List<BacktestResponseDto.ChartPoint> chart = new ArrayList<>();
        Double kospiStart = kospiPrices.get(months.get(0));
        Double sp500Start = sp500Prices.get(months.get(0));

        for (int i = 0; i < months.size(); i++) {
            YearMonth m = months.get(i);
            long pv = Math.round(portfolioValues.get(i));
            Double kp = kospiPrices.get(m);
            long kv = (kospiStart != null && kospiStart > 0 && kp != null)
                    ? Math.round(initialInvestment * kp / kospiStart) : 0;
            Double sp = sp500Prices.get(m);
            long sv = (sp500Start != null && sp500Start > 0 && sp != null)
                    ? Math.round(initialInvestment * sp / sp500Start) : 0;
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

    private double calcBenchmarkReturn(TreeMap<YearMonth, Double> prices, List<YearMonth> months) {
        if (prices.isEmpty() || months.isEmpty()) return 0;
        Double s = prices.get(months.get(0));
        Double e = prices.get(months.get(months.size() - 1));
        return (s != null && s > 0 && e != null) ? (e - s) / s * 100 : 0;
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