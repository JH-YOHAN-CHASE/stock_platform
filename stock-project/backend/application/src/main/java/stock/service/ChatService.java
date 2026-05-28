package stock.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import stock.converter.ChatMessageConverter;
import stock.dto.ChatMessageDto;
import stock.entity.ChatMessage;
import stock.repository.ChatMessageRepository;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageConverter chatMessageConverter;

    @Async("chatTaskExecutor")
    @Transactional
    public void saveMessageAsync(ChatMessageDto.Request request) {
        try {
            ChatMessage entity = chatMessageConverter.toEntity(request);
            chatMessageRepository.save(entity);
        } catch (Exception e) {
            log.error("비동기 채팅 메시지 데이터베이스 저장 실패. 요청 데이터: {}", request, e);
        }
    }

    public List<ChatMessageDto.Response> getChatHistory() {
        return chatMessageRepository.findTop100ByOrderByIdDesc().stream()
                .map(chatMessageConverter::toResponse)
                .collect(Collectors.toList());
    }
}