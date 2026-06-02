package stock.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Builder;

@Builder
public record BacktestRequestDto(
        @NotNull(message = "포트폴리오 ID는 필수입니다.")
        Long portfolioId,

        @NotBlank(message = "시작일은 필수입니다.")
        String startDate,

        @NotBlank(message = "종료일은 필수입니다.")
        String endDate,

        @Positive(message = "초기 투자금은 0보다 커야 합니다.")
        long initialInvestment,

        @PositiveOrZero(message = "월 추가 적립금은 0 이상이어야 합니다.")
        long monthlyAddition,

        @NotNull(message = "리밸런싱 주기는 필수입니다.")
        RebalancingType rebalancing
) {
    // 💡 문자열 대신 데이터 타입을 엄격히 제한하여 컴파일 시점 및 역직렬화 시점의 에러를 방지합니다.
    public enum RebalancingType {
        NONE, QUARTERLY, ANNUALLY
    }
}