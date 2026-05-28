package stock.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
// 💡 Spring Boot 4 표준 차세대 Jackson 패키지로 임포트합니다.
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockResolverService {

    private final Map<String, String> nameToCode = new HashMap<>();
    private final Map<String, String> codeToName = new HashMap<>();
    private final Map<String, String> usCodeToName = new HashMap<>();
    private final List<Map<String, String>> koreanStockList = new ArrayList<>();
    private final List<Map<String, String>> usStockList = new ArrayList<>();

    // 💡 스프링 부트 4가 자동 생성한 tools.jackson 버전의 빈이 이곳으로 주입됩니다.
    private final ObjectMapper objectMapper;

    public enum StockType { KOREAN, US, UNKNOWN }

    public record ResolvedStock(String ticker, StockType type) {}

    @PostConstruct
    //@SuppressWarnings("unchecked")경고 필요없ㅇ
    public void loadStocks() {
        // 1. 국내 주식 로드
        try {
            InputStream is = new ClassPathResource("stocks.json").getInputStream();
            List<Map<String, String>> stocks = objectMapper.readValue(is,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
            for (Map<String, String> stock : stocks) {
                String code = stock.get("code");
                String ko = stock.get("ko");
                if (ko != null) nameToCode.put(ko.toUpperCase(), code);
                if (stock.get("en") != null) nameToCode.put(stock.get("en").toUpperCase(), code);
                nameToCode.put(code, code);
                if (ko != null) codeToName.put(code, ko);
            }
            koreanStockList.addAll(stocks);
            log.info("[StockResolver] 국내 종목 {}개 로드 완료", stocks.size());
        } catch (Exception e) {
            log.error("[StockResolver] stocks.json 로드 실패: {}", e.getMessage());
        }

        // 2. 미국 주식 로드
        try {
            InputStream usIs = new ClassPathResource("us_stocks.json").getInputStream();
            List<Map<String, String>> usStocks = objectMapper.readValue(usIs,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
            for (Map<String, String> stock : usStocks) {
                String ticker = stock.get("ticker");
                String name = stock.get("name");
                if (ticker != null && name != null) usCodeToName.put(ticker.toUpperCase(), name);
            }
            usStockList.addAll(usStocks);
            log.info("[StockResolver] 미국 종목 {}개 로드 완료", usStocks.size());
        } catch (Exception e) {
            log.error("[StockResolver] us_stocks.json 로드 실패: {}", e.getMessage());
        }
    }

    public String getName(String code) {
        if (code == null) return null;
        String upper = code.toUpperCase().trim();

        if (upper.contains(".")) {
            upper = upper.split("\\.")[0];
        }

        String korean = codeToName.get(upper);
        if (korean != null) return korean;
        return usCodeToName.get(upper);
    }

    public List<Map<String, String>> search(String query, int limit) {
        if (query == null || query.isBlank()) return List.of();
        String q = query.toUpperCase().trim();
        List<Map<String, String>> results = new ArrayList<>();

        for (Map<String, String> stock : koreanStockList) {
            String code = stock.getOrDefault("code", "");
            String ko = stock.getOrDefault("ko", "").toUpperCase();
            String en = stock.getOrDefault("en", "").toUpperCase();
            if (code.startsWith(q) || ko.contains(q) || en.contains(q)) {
                results.add(Map.of("ticker", code, "name", stock.getOrDefault("ko", code), "type", "KOREAN"));
                if (results.size() >= limit) return results;
            }
        }

        for (Map<String, String> stock : usStockList) {
            String ticker = stock.getOrDefault("ticker", "").toUpperCase();
            String name = stock.getOrDefault("name", "").toUpperCase();
            String ko = stock.getOrDefault("ko", "").toUpperCase();
            if (ticker.startsWith(q) || name.contains(q) || ko.contains(q)) {
                String displayName = stock.getOrDefault("ko", stock.getOrDefault("name", ticker));
                results.add(Map.of("ticker", ticker, "name", displayName, "type", "US"));
                if (results.size() >= limit) return results;
            }
        }

        return results;
    }

    public ResolvedStock resolve(String query) {
        if (query == null) return new ResolvedStock("", StockType.UNKNOWN);
        String upper = query.toUpperCase().trim();

        if (upper.matches("\\d{6}(\\.(KS|KQ))?")) {
            String cleanTicker = upper.contains(".") ? upper.split("\\.")[0] : upper;
            return new ResolvedStock(cleanTicker, StockType.KOREAN);
        }

        if (nameToCode.containsKey(upper)) {
            return new ResolvedStock(nameToCode.get(upper), StockType.KOREAN);
        }

        if (upper.matches("[A-Z]{1,6}")) {
            return new ResolvedStock(upper, StockType.US);
        }

        return new ResolvedStock(upper, StockType.UNKNOWN);
    }
}