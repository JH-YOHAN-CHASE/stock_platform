package stock.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

public class TagDto {

    @Getter
    @NoArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "태그 이름은 필수입니다")
        @Size(max = 30, message = "태그 이름은 30자 이내")
        private String name;

        @Size(max = 100)
        private String description;
    }

    @Getter
    @Builder
    public static class Response {
        private Long id;
        private String name;
        private String description;
    }
}
