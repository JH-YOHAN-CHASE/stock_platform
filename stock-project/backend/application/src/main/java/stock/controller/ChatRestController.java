package stock.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import stock.dto.ChatMessageDto;
import stock.service.ChatService;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")불필요?
@SuppressWarnings("NullableProblems")//채팅이 없더라도 빈 배열을 보내기에 null 걱정 없어?
public class ChatRestController {

    private final ChatService chatService;

    @GetMapping("/history")
    public ResponseEntity<List<ChatMessageDto.Response>> getHistory() {
        List<ChatMessageDto.Response> history = chatService.getChatHistory();
        return ResponseEntity.ok(history);
    }
}