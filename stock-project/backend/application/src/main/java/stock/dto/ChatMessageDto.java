package stock.dto;

import lombok.*;
import java.time.LocalDateTime;

public class ChatMessageDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    public static class Request {
        private Long userId;
        private String username;
        private String content;
        private Long referencedPortfolioId;
        private String referencedPortfolioName;
        private Long referencedIndexId;
        private String referencedIndexName;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long userId;
        private String username;
        private String content;
        private Long referencedPortfolioId;
        private String referencedPortfolioName;
        private Long referencedIndexId;
        private String referencedIndexName;
        private LocalDateTime createdAt;
    }
}