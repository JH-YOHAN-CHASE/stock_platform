package stock.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import stock.security.CustomOAuth2UserService;
import stock.security.JwtAuthenticationFilter;
import stock.security.JwtProvider;
import stock.security.OAuth2AuthenticationSuccessHandler;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler successHandler;// 네이버 로그인 사용
    private final JwtProvider jwtProvider;

    @Value("${frontend.host}")
    private String frontendHost;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))//서버가 세션 기억을 하지않는다
            .authorizeHttpRequests(auth -> auth
                // 인증 없이 접근 가능
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/oauth2/**").permitAll()
                .requestMatchers("/login/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/portfolios/public").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/indexes/public").permitAll()
                        .requestMatchers("/api/ai/**").permitAll()
                        .requestMatchers("/ws-chat/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/chat/history").permitAll()//과거 채팅
                        .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .userInfoEndpoint(endpoint -> endpoint
                    .userService(customOAuth2UserService)
                )//네이버
                .successHandler(successHandler)
            )
            .addFilterBefore(
                new JwtAuthenticationFilter(jwtProvider),
                UsernamePasswordAuthenticationFilter.class
            );//jwt로 누군지 확인 rds에 담기는거로 jwt로 api호출마다 통과

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // 프론트엔드 + 백엔드 자기 자신도 허용 (OAuth 리다이렉트 대응)
        config.setAllowedOrigins(List.of(frontendHost, "http://54.116.11.250:8083"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Cache-Control"));//보안을 위해 필요한 헤더만
        config.setAllowCredentials(true);//위 설정들 허용
        config.setMaxAge(3600L);//3600L==1시간 동안 요청들 자동허가?

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;//설정값 적용
    }
}
