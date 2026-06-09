package stock.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import stock.dto.AiSimulationResponseDto;
import stock.dto.PortfolioDto;
import stock.dto.CustomIndexDto;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAnalysisService {

    private final PortfolioService portfolioService;
    private final CustomIndexService customIndexService;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Cacheable(value = "aiSimulations", key = "#portfolioId + '-' + #indexId", unless = "#result == null")
    public AiSimulationResponseDto runSimulation(Long portfolioId, Long indexId, Long userId) {

        // 1. 포트폴리오 종목 정보 가져오기
        PortfolioDto.Response portfolio = portfolioService.getPortfolio(portfolioId, userId);

        String stockDetails = portfolio.getItems().stream()
                .map(item -> String.format("- %s (현재가: %s원, 비중: %s%%)",
                        item.getStockName(), item.getCurrentPrice(), item.getWeight()))
                .collect(Collectors.joining("\n"));

        BigDecimal totalCurrentValue = portfolio.getItems().stream()
                .map(i -> i.getCurrentPrice().multiply(new BigDecimal(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. 지수(Index) 구성 지표들 가져오기
        CustomIndexDto.Response indexData = customIndexService.getIndex(indexId, userId);

        String indexDetails = indexData.getComponents().stream()
                .map(c -> String.format("- %s (방향: %s)",
                        c.getIndicatorName(), c.getDirection() == 1 ? "양의 상관" : "음의 상관"))
                .collect(Collectors.joining("\n"));

        // 3. 레이더 차트의 축 동적 생성
        String radarLabels = indexData.getComponents().stream()
                .map(c -> String.format("    { \"subject\": \"%s\", \"portfolio\": 80, \"index_avg\": 50 }", c.getIndicatorName()))
                .collect(Collectors.joining(",\n"));

        /*
         * 💡 [최적화 완료] 무료 버전 Gemini를 위해 요구사항과 출력 글자 수를 대폭 줄임
         */
        String prompt = String.format("""
                너는 퀀트 투자 AI야. 아래 포트폴리오와 지수(시나리오)를 분석해.

                [포트폴리오 총액: %s원]
                %s

                [지수 시나리오]
                %s

                ※ 엄격한 규칙:
                1. 오직 아래 형태의 순수 JSON만 출력할 것. 다른 말은 절대 금지.
                2. recommendation은 반드시 선택한 '포트폴리오'와 선택한 '지표들의 조합인 지수'의 상관관계를 분석하여 "1줄(50자 이내)"의 핵심 투자 전략으로 작성할 것.
                3. radarChart의 'subject'는 제공된 지표명 유지, 점수만 분석에 맞게 변경할 것.

                {
                  "performance": { "return": 15.5, "drawdown": -4.2, "score": 8.5 },
                  "simulationChart": [
                    { "period": "3개월", "value": 4.5 },
                    { "period": "6개월", "value": 8.2 },
                    { "period": "1년", "value": 15.5 }
                  ],
                  "recommendation": "여기에 포트폴리오와 지수를 분석한 1줄 요약 전략을 작성할 것",
                  "radarChart": [
                %s
                  ]
                }""",
                totalCurrentValue, stockDetails, indexDetails, radarLabels
        );

        String jsonResponse = callGeminiApi(prompt);

        // 🚨 [강력 청소기 가동] 무료 버전 제미나이의 예측 불허 텍스트 완벽 방어
        if (jsonResponse != null) {
            // 혹시 남아있을지 모르는 마크다운 블록과 역따옴표 전체 제거
            jsonResponse = jsonResponse.replaceAll("```json", "")
                    .replaceAll("```", "")
                    .replaceAll("`", "")
                    .trim();

            // 앞뒤로 붙은 AI의 불필요한 인사말, 설명글을 완전히 걷어내기 위해 { 와 }의 위치 추적
            int startIndex = jsonResponse.indexOf("{");
            int endIndex = jsonResponse.lastIndexOf("}");

            if (startIndex != -1 && endIndex != -1 && startIndex < endIndex) {
                // 정확히 오리지널 JSON 데이터 바디 { ... } 구간만 칼같이 슬라이싱
                jsonResponse = jsonResponse.substring(startIndex, endIndex + 1);
            }
        }

        try {
            // 정제 및 전처리가 완벽히 끝난 문자열로 DTO 변환(파싱) 진행
            return objectMapper.readValue(jsonResponse, AiSimulationResponseDto.class);
        } catch (Exception e) {
            // 만약 여기서 에러가 난다면, 제미나이가 중괄호 내부 문법(쉼표 누락 등) 자체를 깨뜨린 경우입니다.
            log.error("무료 버전 Gemini의 JSON 규격 위반 (구조 결함): \n{}", jsonResponse, e);
            throw new RuntimeException("AI가 올바른 형식의 응답을 생성하지 못했습니다. 다시 시도해 주세요.");
        }
    }

    private String callGeminiApi(String prompt) {
        String url = geminiApiUrl + "?key=" + geminiApiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                ))
        );

        int maxRetries = 3;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String jsonRequestBody = objectMapper.writeValueAsString(requestBody);

                String responseString = restClient.post()
                        .uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(jsonRequestBody)
                        .retrieve()
                        .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                                (req, resp) -> {
                                    byte[] bodyBytes = resp.getBody().readAllBytes();
                                    String errorBody = new String(bodyBytes, java.nio.charset.StandardCharsets.UTF_8);
                                    log.error("[Gemini API] HTTP {} 에러 응답: {}", resp.getStatusCode(), errorBody);
                                    throw new RuntimeException("Gemini API HTTP 에러: " + resp.getStatusCode());
                                })
                        .body(String.class);

                if (responseString != null) {
                    JsonNode rootNode = objectMapper.readTree(responseString);
                    JsonNode candidatesNode = rootNode.path("candidates");

                    if (candidatesNode.isArray() && !candidatesNode.isEmpty()) {
                        JsonNode parts = candidatesNode.get(0).path("content").path("parts");
                        for (JsonNode part : parts) {
                            if (part.path("thought").asBoolean(false)) continue;
                            String rawText = part.path("text").textValue();
                            if (rawText != null && !rawText.isBlank()) {
                                return rawText.replace("```json", "").replace("```", "").trim();
                            }
                        }
                    }
                    log.error("[Gemini API] 예상치 못한 응답 구조: {}", responseString);
                }
            } catch (Exception e) {
                log.warn("[Gemini API] 시도 {}/{} 실패: {}", attempt, maxRetries, e.getMessage());
                if (attempt < maxRetries) {
                    try { Thread.sleep(3000L * attempt); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                } else {
                    log.error("[Gemini API] 최종 실패", e);
                }
            }
        }
        throw new RuntimeException("Gemini API 호출에 실패했습니다. 백엔드 로그를 확인하세요.");
    }
}