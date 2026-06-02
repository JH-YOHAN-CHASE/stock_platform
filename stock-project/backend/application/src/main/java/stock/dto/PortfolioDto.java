package stock.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PortfolioDto {

    // ── Request ───────────────────────────────────────────────

    @Getter
    @NoArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "포트폴리오 이름은 필수입니다")
        @Size(max = 50, message = "이름은 50자 이내")
        private String name;

        @Size(max = 200, message = "설명은 200자 이내")
        private String description;

        @JsonProperty("isPublic")
        private boolean isPublic = false;

        @Valid
        private List<ItemRequest> items;
    }

    @Getter
    @NoArgsConstructor
    public static class UpdateRequest {
        @NotBlank(message = "포트폴리오 이름은 필수입니다")
        @Size(max = 50)
        private String name;

        @Size(max = 200)
        private String description;

        @JsonProperty("isPublic")
        private boolean isPublic;

        @Valid
        private List<ItemRequest> items;
    }

    @Getter
    @NoArgsConstructor
    public static class ItemRequest {
        @NotBlank(message = "종목 코드는 필수입니다")
        @Size(max = 20, message = "종목 코드는 20자 이내")
        private String ticker;

        @NotBlank(message = "종목 이름은 필수입니다")
        private String stockName;

        @NotNull
        @Min(value = 1, message = "수량은 1 이상")
        private Integer quantity;

        @NotNull
        @DecimalMin(value = "0.0001", message = "매수 단가는 0보다 커야 합니다")
        private BigDecimal avgBuyPrice;

        private LocalDate purchaseDate;

        @DecimalMin("0.00") @DecimalMax("100.00")
        private BigDecimal weight;
    }

    // ── Response ──────────────────────────────────────────────

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private Long userId;
        private String userName;
        private String name;
        private String description;
        @JsonProperty("isPublic")
        private boolean isPublic;
        private List<ItemResponse> items;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Builder
    public static class ItemResponse {
        private BigDecimal currentPrice;
        private Long id;
        private String ticker;
        private String stockName;
        private Integer quantity;
        private BigDecimal avgBuyPrice;
        private LocalDate purchaseDate;
        private BigDecimal weight;

        public void setCurrentPrice(BigDecimal currentPrice) {
            this.currentPrice = currentPrice;
        }

        public void setStockName(String stockName) {
            this.stockName = stockName;
        }
    }

    @Getter
    @Builder
    public static class SummaryResponse {
        private Long id;
        private Long userId;
        private String userName;
        private String name;
        private String description;

        @JsonProperty("isPublic")
        private boolean isPublic;
        private int itemCount;
        private LocalDateTime createdAt;
    }
    // ── Compare Chart Request & Response (시계열 차트 비교 전용) ────────

    @Getter
    @NoArgsConstructor
    public static class CompareChartRequest {
        @NotEmpty(message = "비교할 포트폴리오를 선택해주세요")
        private List<Long> portfolioIds;

        private String startDate;       // 예: "2023-01-01"
        private String endDate;         // 예: "2024-01-01"
        private long initialInvestment; // 초기 투자금
        private long monthlyAddition;   // 매월 적립금
    }

    @Getter
    @Builder
    public static class CompareChartResponse {
        private Long portfolioId;
        private String portfolioName;

        // 백테스트(시뮬레이션) 결과를 통째로 담아서 프론트엔드 차트로 넘겨줍니다.
        private BacktestResponseDto.Response backtestData;
    }
}
