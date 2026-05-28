package stock.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import stock.dto.ChatMessageDto;
import stock.service.ChatService;
import java.time.LocalDateTime;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final ChatService chatService;


    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/public")
    public ChatMessageDto.Response sendMessage(ChatMessageDto.Request request) {

        // 1. 비동기 백그라운드 스레드에 DB 저장 작업 위임 (웹소켓 스레드 락 방지)
        chatService.saveMessageAsync(request);

        // 2. 대기 시간(I/O 락) 없이 즉시 수신 대기 중인 모든 커넥션 사용자에게 메시지 실시간 반환
        return ChatMessageDto.Response.builder()
                .id(System.currentTimeMillis()) // 임시 유니크 ID 부여 (정확한 ID는 DB 자동 생성)
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
}