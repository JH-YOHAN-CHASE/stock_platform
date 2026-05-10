package stock.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import stock.dto.ApiResponse;
import stock.dto.AiSimulationRequestDto;
import stock.dto.AiSimulationResponseDto;
import stock.service.AiAnalysisService;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000") // 프론트엔드 주소에 맞게 설정
public class AiSimulationController {

    private final AiAnalysisService aiAnalysisService;

    // 프론트엔드 호출 주소와 일치하도록 /simulation 으로 변경
    @PostMapping("/simulation")
    public ResponseEntity<ApiResponse<AiSimulationResponseDto>> runSimulation(
            @RequestBody AiSimulationRequestDto request,
            @AuthenticationPrincipal Long userId) {

        // 로그인 처리가 안되어 userId가 null일 수 있으므로 우선 임시로 1L을 사용하도록 하거나, 보안설정 확인 필요
        Long currentUserId = (userId != null) ? userId : 1L;

        AiSimulationResponseDto result = aiAnalysisService.runSimulation(
                request.getPortfolioId(),
                request.getIndexId(),
                currentUserId
        );

        return ResponseEntity.ok(ApiResponse.ok("AI 시뮬레이션이 완료되었습니다.", result));
    }
}