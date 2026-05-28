package stock.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import stock.dto.ApiResponse;
import stock.dto.AiSimulationRequestDto;
import stock.dto.AiSimulationResponseDto;
import stock.service.AiAnalysisService;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
// SecurityConfig에 CORS 설정이 이미 있으므로, 중복되는 @CrossOrigin 어노테이션을 제거했습니다.
public class AiSimulationController {

    private final AiAnalysisService aiAnalysisService;

    @PostMapping("/simulation")
    public ResponseEntity<ApiResponse<AiSimulationResponseDto>> runSimulation(
            @RequestBody AiSimulationRequestDto request,
            @AuthenticationPrincipal Long userId) {

        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 유저 정보가 존재하지 않습니다.");
        }

        AiSimulationResponseDto result = aiAnalysisService.runSimulation(
                request.getPortfolioId(),
                request.getIndexId(),
                userId
        );

        return ResponseEntity.ok(ApiResponse.ok("AI 시뮬레이션이 완료되었습니다.", result));
    }
}