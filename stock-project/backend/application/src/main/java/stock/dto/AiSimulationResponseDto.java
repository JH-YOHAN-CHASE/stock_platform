package stock.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class AiSimulationResponseDto {
    private Performance performance;
    private List<ChartPoint> simulationChart;
    private String recommendation;
    private List<RadarPoint> radarChart;

    @Data
    public static class Performance {
        @JsonProperty("return")
        private Double returnRate;
        private Double drawdown;
        private Double score;
    }

    @Data
    public static class ChartPoint {
        private String period;
        private Double value;
    }

    @Data
    public static class RadarPoint {
        private String subject;
        private Integer portfolio;
        private Integer index_avg;
    }
}