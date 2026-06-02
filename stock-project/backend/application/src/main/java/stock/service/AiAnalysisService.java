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

        // 💡 [수정] 가중치를 제거했으므로 포맷팅 문자열에서도 가중치를 삭제하고 방향을 한글로 치환
        String indexDetails = indexData.getComponents().stream()
                .map(c -> String.format("- %s (방향: %s)",
                        c.getIndicatorName(), c.getDirection() == 1 ? "양의 상관" : "음의 상관"))
                .collect(Collectors.joining("\n"));

        // 3. 레이더 차트의 축 동적 생성
        String radarLabels = indexData.getComponents().stream()
                .map(c -> String.format("    { \"subject\": \"%s\", \"portfolio\": 80, \"index_avg\": 50 }", c.getIndicatorName()))
                .collect(Collectors.joining(",\n"));

        /*
         * 💡 [수정] JSON 블록 내부에 있던 주석(//)을 바깥으로 빼서 ObjectMapper 에러 원천 차단
         */
        String prompt = String.format("""
                너는 주식 시장 전문 퀀트 투자 AI야. 아래 내 포트폴리오와 내가 만든 거시경제지표와 커스텀지표의 조합인 지수(시나리오)를 결합하여 분석해줘.

                [1. 분석 대상 포트폴리오 (총액: %s원)]
                %s

                [2. 사용자가 설정한 지수 시나리오]
                %s

                위의 지수 시나리오(환율 하락, 금리 인상, 커스텀 지표 등)가 발생했을 때 이 포트폴리오 종목들이 어떻게 반응할지 상관관계를 분석해야 해.

                ※ 주의사항: 
                - radarChart의 'subject'는 제공된 지표명들을 그대로 사용하고, 'portfolio', 'index_avg' 점수만 분석에 맞게 변경할 것.
                - 반드시 아래 형태의 순수 JSON으로만 대답할 것. 
                - ```json 같은 마크다운 블록이나 내부 주석(//)은 절대로 쓰지 말 것.

                {
                  "performance": { "return": 15.5, "drawdown": -4.2, "score": 8.5 },
                  "simulationChart": [
                    { "period": "3개월", "value": 4.5 },
                    { "period": "6개월", "value": 8.2 },
                    { "period": "1년", "value": 15.5 }
                  ],
                  "recommendation": "해당 거시경제 지표들과 포트폴리오 종목 간의 상관관계를 심층 분석하고, 리밸런싱 전략을 3줄로 작성해줘.",
                  "radarChart": [
                %s
                  ]
                }""",
                totalCurrentValue, stockDetails, indexDetails, radarLabels
        );

        String jsonResponse = callGeminiApi(prompt);

        try {
            return objectMapper.readValue(jsonResponse, AiSimulationResponseDto.class);
        } catch (Exception e) {
            log.error("JSON 파싱 실패 (AI가 JSON 형식을 어김): \n{}", jsonResponse, e);
            throw new RuntimeException("AI 응답을 처리하는 중 오류가 발생했습니다.");
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