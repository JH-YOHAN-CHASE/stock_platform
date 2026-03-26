package stock.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import stock.dto.ApiResponse;
import stock.dto.CustomIndexDto;
import stock.service.CustomIndexService;

import java.util.List;

@RestController
@RequestMapping("/api/indexes")
@RequiredArgsConstructor
public class CustomIndexController {

    private final CustomIndexService customIndexService;

    // 내 지수 목록
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<CustomIndexDto.SummaryResponse>>> getMyIndexes(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(customIndexService.getMyIndexes(userId)));
    }

    // 공개 지수 목록
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<CustomIndexDto.SummaryResponse>>> getPublicIndexes() {
        return ResponseEntity.ok(ApiResponse.ok(customIndexService.getPublicIndexes()));
    }

    // 접근 가능한 지수 목록 (내 것 + 공개)
    @GetMapping("/accessible")
    public ResponseEntity<ApiResponse<List<CustomIndexDto.SummaryResponse>>> getAccessibleIndexes(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(customIndexService.getAccessibleIndexes(userId)));
    }

    // 지수 상세
    @GetMapping("/{indexId}")
    public ResponseEntity<ApiResponse<CustomIndexDto.Response>> getIndex(
            @PathVariable Long indexId,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(customIndexService.getIndex(indexId, userId)));
    }

    // 지수 생성
    @PostMapping
    public ResponseEntity<ApiResponse<CustomIndexDto.Response>> createIndex(
            @Valid @RequestBody CustomIndexDto.CreateRequest request,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok("지수가 생성되었습니다", customIndexService.createIndex(request, userId)));
    }

    // 지수 수정
    @PutMapping("/{indexId}")
    public ResponseEntity<ApiResponse<CustomIndexDto.Response>> updateIndex(
            @PathVariable Long indexId,
            @Valid @RequestBody CustomIndexDto.UpdateRequest request,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok("지수가 수정되었습니다", customIndexService.updateIndex(indexId, request, userId)));
    }

    // 지수 삭제
    @DeleteMapping("/{indexId}")
    public ResponseEntity<ApiResponse<Void>> deleteIndex(
            @PathVariable Long indexId,
            @AuthenticationPrincipal Long userId) {
        customIndexService.deleteIndex(indexId, userId);
        return ResponseEntity.ok(ApiResponse.ok("지수가 삭제되었습니다", null));
    }
}
