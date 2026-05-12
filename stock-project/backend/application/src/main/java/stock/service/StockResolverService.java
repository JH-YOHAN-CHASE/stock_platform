package stock.service;

import tools.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class StockResolverService {

    private final Map<String, String> nameToCode = new HashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public enum StockType { KOREAN, US, UNKNOWN }

    public record ResolvedStock(String ticker, StockType type) {}

    @PostConstruct
    @SuppressWarnings("unchecked")
    public void loadStocks() {
        try {
            InputStream is = new ClassPathResource("stocks.json").getInputStream();
            List<Map<String, String>> stocks = objectMapper.readValue(is,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Map.class));
            for (Map<String, String> stock : stocks) {
                String code = stock.get("code");
                if (stock.get("ko") != null) nameToCode.put(stock.get("ko").toUpperCase(), code);
                if (stock.get("en") != null) nameToCode.put(stock.get("en").toUpperCase(), code);
                nameToCode.put(code, code);
            }
            log.info("[StockResolver] 종목 {}개 로드 완료", stocks.size());
        } catch (Exception e) {
            log.error("[StockResolver] stocks.json 로드 실패: {}", e.getMessage());
        }
    }

    public ResolvedStock resolve(String query) {
        String upper = query.toUpperCase().trim();

        // 6자리 숫자 → 한국 주식 코드
        if (upper.matches("\\d{6}")) {
            return new ResolvedStock(upper, StockType.KOREAN);
        }

        // 이름 맵에 있는 경우 → 한국 주식
        if (nameToCode.containsKey(upper)) {
            return new ResolvedStock(nameToCode.get(upper), StockType.KOREAN);
        }

        // 영어 알파벳 1~6자 → 미국 주식 티커
        if (upper.matches("[A-Z]{1,6}")) {
            return new ResolvedStock(upper, StockType.US);
        }

        return new ResolvedStock(upper, StockType.UNKNOWN);
    }
}