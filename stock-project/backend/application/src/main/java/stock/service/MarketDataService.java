package stock.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class MarketDataService {

    @Value("${kis.api.url}")
    private String apiUrl;

    @Value("${kis.api.app-key}")
    private String appKey;

    @Value("${kis.api.app-secret}")
    private String appSecret;

    private final RestTemplate restTemplate;
    private String cachedToken = null;

    public MarketDataService() {
        this.restTemplate = new RestTemplate();
    }

    private String getAccessToken() {
        if (cachedToken != null) return cachedToken;

        String tokenUrl = apiUrl + "/oauth2/tokenP";
        Map<String, String> body = new HashMap<>();
        body.put("grant_type", "client_credentials");
        body.put("appkey", appKey);
        body.put("appsecret", appSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, new HttpEntity<>(body, headers), Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                cachedToken = (String) response.getBody().get("access_token");
                return cachedToken;
            }
        } catch (Exception e) {
            log.error("[KIS API] 토큰 발급 실패: {}", e.getMessage());
        }
        throw new RuntimeException("증권사 API 토큰 발급에 실패했습니다.");
    }

    @Cacheable(value = "stockPrices", key = "#ticker", unless = "#result == null || #result.compareTo(java.math.BigDecimal.ZERO) == 0")
    public BigDecimal getClosingPrice(String ticker) {
        // 💡 [리팩토링] KIS 초당 호출 제한(TPS) 방지를 위해 0.5초 대기
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        log.info("[외부 API 호출] {} 종목의 실시간 현재가를 요청합니다.", ticker);

        try {
            String token = getAccessToken();
            String url = apiUrl + "/uapi/domestic-stock/v1/quotations/inquire-price"
                    + "?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=" + ticker;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("authorization", "Bearer " + token);
            headers.set("appkey", appKey);
            headers.set("appsecret", appSecret);
            headers.set("tr_id", "FHKST01010100");

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> output = (Map<String, Object>) response.getBody().get("output");
                if (output != null && output.get("stck_prpr") != null) {
                    BigDecimal price = new BigDecimal((String) output.get("stck_prpr"));
                    log.info("[KIS API] {} 조회 성공: {}원", ticker, price);
                    return price;
                }
            }
        } catch (Exception e) {
            log.error("[KIS API] {} 조회 실패: {}", ticker, e.getMessage());
        }

        return BigDecimal.ZERO;
    }
}