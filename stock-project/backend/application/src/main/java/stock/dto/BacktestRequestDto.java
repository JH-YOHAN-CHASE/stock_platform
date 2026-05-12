package stock.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BacktestRequestDto {
    private Long portfolioId;
    private String startDate;
    private String endDate;
    private long initialInvestment;
    private long monthlyAddition; // 0이면 적립 없음
    private String rebalancing; // NONE, QUARTERLY, ANNUALLY
}
