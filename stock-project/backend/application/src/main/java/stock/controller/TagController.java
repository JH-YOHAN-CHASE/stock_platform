package stock.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import stock.converter.TagConverter;
import stock.dto.ApiResponse;
import stock.dto.TagDto;
import stock.service.TagService;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;
    private final TagConverter tagConverter;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TagDto.Response>>> getAllTags() {
        return ResponseEntity.ok(ApiResponse.ok(tagService.getAllTags()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TagDto.Response>> createTag(
            @Valid @RequestBody TagDto.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("태그가 저장되었습니다", tagService.createTag(request)));
    }
}
