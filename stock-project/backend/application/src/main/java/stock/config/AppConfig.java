package stock.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class AppConfig {

    @Bean
    public RestClient restClient() {
        // 1. 타임아웃 설정을 위한 팩토리 생성
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); // 커넥션 타임아웃: 5초
        factory.setReadTimeout(15000);   // 리드 타임아웃: 15초

        // 2. RestClient 빌드 및 전역 헤더 추가
        return RestClient.builder()
                .requestFactory(factory)
                .defaultHeader("User-Agent", "Mozilla/5.0") //
                .build();
    }
}