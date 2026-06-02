package stock.dto;

import lombok.Builder;
import java.util.List;

public class BacktestResponseDto {

    @Builder
    public record Response(
            List<ChartPoint> chartData,
            Metrics metrics,
            List<YearlyReturn> yearlyReturns
    ) {}

    @Builder
    public record ChartPoint(
            String date,
            long portfolioValue,
            long kospiValue,
            long sp500Value
    ) {}

    @Builder
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

    @Builder
    public record YearlyReturn(
            int year,
            double portfolioReturn,
            double kospiReturn,
            double sp500Return
    ) {}
}