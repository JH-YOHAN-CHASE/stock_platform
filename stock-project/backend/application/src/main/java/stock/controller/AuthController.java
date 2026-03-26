package stock.controller;

import stock.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import stock.dto.ApiResponse;
import stock.security.JwtProvider;
import stock.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtProvider jwtProvider;
    private final UserService userService;

    // 현재 로그인한 사용자 정보
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMe(
            @AuthenticationPrincipal Long userId) {
        User user = userService.getById(userId);
        Map<String, Object> data = Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName(),
                "profileImage", user.getProfileImage() != null ? user.getProfileImage() : "",
                "provider", user.getProvider().name()
        );
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    // 리프레시 토큰으로 액세스 토큰 재발급
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, String>>> refresh(
            @RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null || !jwtProvider.validateToken(refreshToken)) {
            return ResponseEntity.status(401).body(ApiResponse.error("유효하지 않은 리프레시 토큰"));
        }
        Long userId = jwtProvider.getUserId(refreshToken);
        User user = userService.getById(userId);
        String newAccessToken = jwtProvider.createAccessToken(userId, user.getEmail());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accessToken", newAccessToken)));
    }
}
