package stock.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import stock.dto.ApiResponse;
import stock.dto.BacktestRequestDto;
import stock.dto.BacktestResponseDto;
import stock.service.BacktestService;

@RestController
@RequestMapping("/api/backtest")
@RequiredArgsConstructor
public class BacktestController {

    private final BacktestService backtestService;

    @PostMapping
    public ResponseEntity<ApiResponse<BacktestResponseDto.Response>> runBacktest(
            @RequestBody BacktestRequestDto request,
            @AuthenticationPrincipal Long userId) {
        BacktestResponseDto.Response result = backtestService.runBacktest(request, userId);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}