package stock.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import stock.dto.ApiResponse;
import stock.dto.PortfolioDto;
import stock.service.PortfolioService;

import java.util.List;

@RestController
@RequestMapping("/api/portfolios")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    // 내 포트폴리오 목록
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<PortfolioDto.SummaryResponse>>> getMyPortfolios(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(portfolioService.getMyPortfolios(userId)));
    }

    // 공개 포트폴리오 목록 (비교용)
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<PortfolioDto.SummaryResponse>>> getPublicPortfolios(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(portfolioService.getPublicPortfolios(userId)));
    }

    // 포트폴리오 상세
    @GetMapping("/{portfolioId}")
    public ResponseEntity<ApiResponse<PortfolioDto.Response>> getPortfolio(
            @PathVariable Long portfolioId,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(portfolioService.getPortfolio(portfolioId, userId)));
    }

    // ⭐ [수정됨] 단순 비교 API는 삭제하고, 차트용 시뮬레이션 비교 API만 남김
    @PostMapping("/compare/chart")
    public ResponseEntity<ApiResponse<List<PortfolioDto.CompareChartResponse>>> comparePortfoliosChart(
            @Valid @RequestBody PortfolioDto.CompareChartRequest request,
            @AuthenticationPrincipal Long userId) {

        List<PortfolioDto.CompareChartResponse> chartData = portfolioService.comparePortfoliosWithChart(request, userId);
        return ResponseEntity.ok(ApiResponse.ok("실제 주가 데이터를 바탕으로 비교 차트가 생성되었습니다.", chartData));
    }

    // 포트폴리오 생성
    @PostMapping
    public ResponseEntity<ApiResponse<PortfolioDto.Response>> createPortfolio(
            @Valid @RequestBody PortfolioDto.CreateRequest request,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok("포트폴리오가 생성되었습니다", portfolioService.createPortfolio(request, userId)));
    }

    // 포트폴리오 수정
    @PutMapping("/{portfolioId}")
    public ResponseEntity<ApiResponse<PortfolioDto.Response>> updatePortfolio(
            @PathVariable Long portfolioId,
            @Valid @RequestBody PortfolioDto.UpdateRequest request,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok("포트폴리오가 수정되었습니다", portfolioService.updatePortfolio(portfolioId, request, userId)));
    }

    // 포트폴리오 삭제
    @DeleteMapping("/{portfolioId}")
    public ResponseEntity<ApiResponse<Void>> deletePortfolio(
            @PathVariable Long portfolioId,
            @AuthenticationPrincipal Long userId) {
        portfolioService.deletePortfolio(portfolioId, userId);
        return ResponseEntity.ok(ApiResponse.ok("포트폴리오가 삭제되었습니다", null));
    }
}
