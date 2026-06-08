package stock.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import stock.entity.IndexComponent;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CustomIndexDto {

    // ── Request ───────────────────────────────────────────────

    @Getter
    @NoArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "지수 이름은 필수입니다")
        @Size(max = 10, message = "지수 이름은 1자이상 10자이하로 해주세요")
        private String name;

        @Size(max = 80, message = "설명은 80자 이내")
        private String description;

        @JsonProperty("isPublic")
        private boolean isPublic = false;

        @Valid
        @NotEmpty(message = "지표 구성요소를 1개 이상 추가하세요")
        private List<ComponentRequest> components;
    }

    @Getter
    @NoArgsConstructor
    public static class UpdateRequest {
        @NotBlank
        @Size(max = 10)
        private String name;

        @Size(max = 80)
        private String description;

        @JsonProperty("isPublic")
        private boolean isPublic;

        @Valid
        @NotEmpty
        private List<ComponentRequest> components;
    }

    @Getter
    @NoArgsConstructor
    public static class ComponentRequest {
        @NotNull(message = "지표 유형은 필수입니다")
        private IndexComponent.IndicatorType indicatorType;

        @NotBlank(message = "지표 이름은 필수입니다")
        @Size(max = 50)
        private String indicatorName;

//        @NotNull
//        @DecimalMin("0.01") @DecimalMax("100.00")
//        private BigDecimal weight;

        @NotNull
        private Integer direction;  // 1 or -1

        @Size(max = 80)
        private String description;

        private String dataSourceCode;
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
        private List<ComponentResponse> components;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Builder
    public static class ComponentResponse {
        private Long id;
        private IndexComponent.IndicatorType indicatorType;
        private String indicatorName;
        //private BigDecimal weight;
        private Integer direction;
        private String description;
        private String dataSourceCode;
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
        private int componentCount;
        private LocalDateTime createdAt;
    }
}
