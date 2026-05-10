package stock.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import stock.dto.AiSimulationResponseDto;
import stock.dto.PortfolioDto;
import stock.dto.CustomIndexDto; // 💡 CustomIndexDto 임포트 추가
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
    private final CustomIndexService customIndexService; // 💡 사용자가 만든 지수 정보를 가져오기 위해 추가
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

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

        // 2. 💡 지수(Index) 구성 지표들 가져오기 (환율, 금리 등)
        CustomIndexDto.Response indexData = customIndexService.getIndex(indexId, userId);

        String indexDetails = indexData.getComponents().stream()
                .map(c -> String.format("- %s (방향: %s, 가중치: %s%%)",
                        c.getIndicatorName(), c.getDirection(), c.getWeight()))
                .collect(Collectors.joining("\n"));

        // 3. 💡 레이더 차트의 축(Subject)을 사용자가 만든 지표 이름으로 동적 생성
        String radarLabels = indexData.getComponents().stream()
                .map(c -> String.format("    { \"subject\": \"%s\", \"portfolio\": 80, \"index_avg\": 50 }", c.getIndicatorName()))
                .collect(Collectors.joining(",\n"));

        // 4. 💡 AI에게 '종목 정보'와 '지수 정보'를 모두 포함하여 똑똑하게 묻기
        String prompt = String.format(
                "너는 대한민국 주식 시장 전문 퀀트 투자 AI야. 아래 내 포트폴리오와 내가 예상하는 거시경제 지수(시나리오)를 결합하여 분석해줘.\n\n" +
                        "[1. 분석 대상 포트폴리오 (총액: %s원)]\n%s\n\n" +
                        "[2. 사용자가 설정한 거시경제 지수 시나리오]\n%s\n\n" +
                        "위의 지수 시나리오(예: 환율 하락, 금리 인상 등)가 발생했을 때 이 포트폴리오 종목들이 어떻게 반응할지 상관관계를 분석해야 해.\n\n" +
                        "반드시 아래 형태의 순수 JSON으로만 대답해. ```json 같은 마크다운은 절대 쓰지마.\n" +
                        "{\n" +
                        "  \"performance\": { \"return\": 15.5, \"drawdown\": -4.2, \"score\": 8.5 },\n" +
                        "  \"simulationChart\": [\n" +
                        "    { \"period\": \"3개월\", \"value\": 4.5 },\n" +
                        "    { \"period\": \"6개월\", \"value\": 8.2 },\n" +
                        "    { \"period\": \"1년\", \"value\": 15.5 }\n" +
                        "  ],\n" +
                        "  \"recommendation\": \"해당 거시경제 지표들과 포트폴리오 종목 간의 상관관계를 심층 분석하고, 리밸런싱 전략을 3줄로 작성해줘.\",\n" +
                        "  \"radarChart\": [\n" +
                        "    // 반드시 아래 제공된 지표명들을 'subject' 축으로 그대로 사용하되, 점수(portfolio, index_avg)는 네 분석에 맞게 바꿔서 반환할 것\n%s\n" +
                        "  ]\n" +
                        "}",
                totalCurrentValue, stockDetails, indexDetails, radarLabels
        );

        String jsonResponse = callGeminiApi(prompt);

        try {
            // Gemini가 준 JSON 텍스트를 자바 객체(AiSimulationResponseDto)로 완벽 변환
            return objectMapper.readValue(jsonResponse, AiSimulationResponseDto.class);
        } catch (Exception e) {
            log.error("JSON 파싱 실패 (AI가 JSON 형식을 어김): {}", jsonResponse, e);
            throw new RuntimeException("AI 응답을 처리하는 중 오류가 발생했습니다.");
        }
    }

    private String callGeminiApi(String prompt) {
        String url = geminiApiUrl + "?key=" + geminiApiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt))
                ))
        );

        try {
            Map<String, Object> response = restTemplate.postForObject(url, new HttpEntity<>(requestBody, headers), Map.class);
            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                String rawText = (String) parts.get(0).get("text");

                // 마크다운 백틱(```json) 제거 처리
                return rawText.replaceAll("```json", "").replaceAll("```", "").trim();
            }
        } catch (Exception e) {
            log.error("[Gemini API] 통신 실패: {}", e.getMessage());
        }
        return "{}"; // 실패 시 빈 JSON 반환
    }
}