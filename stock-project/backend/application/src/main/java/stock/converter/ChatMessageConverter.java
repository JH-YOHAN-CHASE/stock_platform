package stock.converter;

import org.springframework.stereotype.Component;
import stock.dto.ChatMessageDto;
import stock.entity.ChatMessage;
import java.time.LocalDateTime;

@Component
public class ChatMessageConverter {

    public ChatMessage toEntity(ChatMessageDto.Request request) {
        if (request == null) {
            return null;
        }
        return ChatMessage.builder()
                .userId(request.getUserId())
                .username(request.getUsername())
                .content(request.getContent())
                .referencedPortfolioId(request.getReferencedPortfolioId())
                .referencedPortfolioName(request.getReferencedPortfolioName())
                .referencedIndexId(request.getReferencedIndexId())
                .referencedIndexName(request.getReferencedIndexName())
                .createdAt(LocalDateTime.now())
                .build();
    }

    public ChatMessageDto.Response toResponse(ChatMessage entity) {
        if (entity == null) {
            return null;
        }
        return ChatMessageDto.Response.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .username(entity.getUsername())
                .content(entity.getContent())
                .referencedPortfolioId(entity.getReferencedPortfolioId())
                .referencedPortfolioName(entity.getReferencedPortfolioName())
                .referencedIndexId(entity.getReferencedIndexId())
                .referencedIndexName(entity.getReferencedIndexName())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}