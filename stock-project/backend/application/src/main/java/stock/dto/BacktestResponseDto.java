package stock.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

public class BacktestResponseDto {

    @Getter
    @Builder
    public static class Response {
        private List<ChartPoint> chartData;
        private Metrics metrics;
        private List<YearlyReturn> yearlyReturns;
    }

    public record ChartPoint(String date, long portfolioValue, long kospiValue, long sp500Value) {}

    public record Metrics(
            double totalReturn,
            double cagr,
            double mdd,
            double volatility,
            double sharpeRatio,
            double kospiTotalReturn,
            double sp500TotalReturn,
            long finalValue,
            long initialInvestment,
            long totalInvested
    ) {}

    public record YearlyReturn(int year, double portfolioReturn, double kospiReturn, double sp500Return) {}
}