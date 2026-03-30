package stock.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtProvider jwtProvider;

    @Value("${frontend.host}")
    private String frontendHost;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        Long userId = (Long) oAuth2User.getAttributes().get("userId");
        String email = (String) oAuth2User.getAttributes().get("email");

        String accessToken  = jwtProvider.createAccessToken(userId, email);
        String refreshToken = jwtProvider.createRefreshToken(userId);

        // 프론트엔드 콜백 URL로 토큰 전달
        String redirectUrl = UriComponentsBuilder
                .fromUriString(frontendHost + "/oauth2/callback")
                .queryParam("token", accessToken)
                .queryParam("refresh", refreshToken)
                .build().toUriString();

        log.info("OAuth2 로그인 성공, userId={}, 리다이렉트={}", userId, redirectUrl);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
