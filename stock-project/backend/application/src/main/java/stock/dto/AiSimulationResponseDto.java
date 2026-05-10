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
        private double returnRate; // JSON의 "return"과 매핑
        private double drawdown;
        private double score;
    }

    @Data
    public static class ChartPoint {
        private String period;
        private double value;
    }

    @Data
    public static class RadarPoint {
        private String subject;
        private int portfolio;
        private int index_avg;
    }
}