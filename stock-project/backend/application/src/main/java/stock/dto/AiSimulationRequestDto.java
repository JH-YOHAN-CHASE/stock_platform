package stock.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AiSimulationRequestDto {
    private Long portfolioId;
    private Long indexId; // List<Long> 에서 단일 Long으로 변경
}