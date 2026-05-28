package stock.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class MarketDataService {

    @Value("${yahoo.api.url}")
    private String baseUrl;

    private final RestClient restClient;
    private final Map<String, String> companyNameCache = new ConcurrentHashMap<>();

    public MarketDataService(RestClient restClient) {
        this.restClient = restClient;
    }

    private String convertToYahooSymbol(String ticker) {
        if (ticker == null) return "";
        String trimmed = ticker.trim();
        if (trimmed.matches("\\d{6}")) {
            return trimmed + ".KS";
        }
        return trimmed.toUpperCase();
    }

    private boolean isUsStock(String symbol) {
        return !symbol.contains(".KS") && !symbol.contains(".KQ");
    }

    // ==========================================
    // 1. 실시간 현재가 조회 (국내/해외 통합)
    // ==========================================
    public BigDecimal getClosingPrice(String ticker) {
        String symbol = convertToYahooSymbol(ticker);
        log.info("[Yahoo Finance] {} 종목의 실시간 현재가를 요청합니다. (심볼: {})", ticker, symbol);

        BigDecimal rawPrice = fetchYahooCurrentPrice(symbol);
        if (rawPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("[ERROR] 실시간 현재가를 가져올 수 없습니다: " + symbol);
        }

        if (isUsStock(symbol)) {
            BigDecimal rate = fetchUsdKrwRate(null);
            BigDecimal krw = rawPrice.multiply(rate).setScale(0, RoundingMode.HALF_UP);
            log.info("[Yahoo Finance] 미국 주식 {} 현재가 변환: ${} × {}원 = {}원", symbol, rawPrice, rate, krw);
            return krw;
        }

        log.info("[Yahoo Finance] 국내 주식 {} 현재가 조회 성공: {}원", symbol, rawPrice);
        return rawPrice.setScale(0, RoundingMode.HALF_UP);
    }

    // ==========================================
    // 2. 특정 날짜 과거 종가 조회 (국내/해외 통합)
    // ==========================================
    /*
     * [디버깅 구간] Cannot resolve variable 'java'
     * - 이전 문제점: SpEL(스프링 표현식) 내부에서 패키지 경로(`java.math.BigDecimal.ZERO`)를 일반 자바 코드처럼 그대로 적으면,
                     스프링이 'java'라는 변수를 찾으려고 시도하여 `EvaluationException` 런타임 에러가 발생하거나 캐싱 조건이 씹히게 됨.
     * - 변경 이유: SpEL 내에서 정적 클래스나 상수를 참조할 때는 반드시 `T(클래스경로)` 연산자를 사용해야 하므로 `T(java.math.BigDecimal).ZERO`로 수정.
     */
    @Cacheable(value = "historicalPrices", key = "#ticker + '-' + #date", unless = "#result == null || #result.compareTo(T(java.math.BigDecimal).ZERO) == 0")
    public BigDecimal getClosingPriceByDate(String ticker, String date) {
        String symbol = convertToYahooSymbol(ticker);
        log.info("[Yahoo Finance] {} 종목의 {} 날짜 종가를 요청합니다. (심볼: {})", ticker, date, symbol);

        BigDecimal rawPrice = fetchYahooPriceByDate(symbol, date);
        if (rawPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("[ERROR] 해당 날짜 또는 직전 거래일의 주가 데이터가 존재하지 않습니다: " + date);
        }

        if (isUsStock(symbol)) {
            BigDecimal rate = fetchUsdKrwRate(date);
            BigDecimal krw = rawPrice.multiply(rate).setScale(0, RoundingMode.HALF_UP);
            log.info("[Yahoo Finance] 미국 주식 {} 종가 변환: ${} × {}원 = {}원 ({})", symbol, rawPrice, rate, krw, date);
            return krw;
        }

        log.info("[Yahoo Finance] 국내 주식 {} 종가 조회 성공: {}원 ({})", symbol, rawPrice, date);
        return rawPrice.setScale(0, RoundingMode.HALF_UP);
    }

    // ==========================================
    // 야후 파이낸스 연동 내부 로직 (RestClient 최적화)
    // ==========================================

    @SuppressWarnings("unchecked")
    private BigDecimal fetchYahooCurrentPrice(String symbol) {
        try {
            String url = baseUrl + "/v8/finance/chart/" + symbol + "?interval=1d&range=1d";
            Map<String, Object> response = restClient.get().uri(url).retrieve().body(Map.class);

            if (response != null) {
                Map<String, Object> chart = (Map<String, Object>) response.get("chart");
                List<Map<String, Object>> result = (List<Map<String, Object>>) chart.get("result");
                if (result != null && !result.isEmpty()) {
                    /*
                     * [디버깅 구간 2] Can be replaced with 'getFirst()' call
                     * - 이전 문제점: Java 21부터 도입된 Sequenced Collections 스펙에 따라, List의 첫 번째 요소를 가져올 때 오래된 방식인 `get(0)`을 사용함.
                     * - 변경 이유: 가독성을 높이고 순서가 보장된 컬렉션의 명확한 시맨틱(Semantic)을 활용하기 위해 최신 표준 메서드인 `.getFirst()`로 전면 교체.
                     */
                    Object price = ((Map<String, Object>) result.getFirst().get("meta")).get("regularMarketPrice");
                    if (price != null) return new BigDecimal(price.toString());
                }
            }
        } catch (Exception e) {
            log.error("[Yahoo Finance] {} 현재가 API 통신 실패: {}", symbol, e.getMessage());
        }
        return BigDecimal.ZERO;
    }

    @SuppressWarnings("unchecked")
    private BigDecimal fetchYahooPriceByDate(String symbol, String dateStr) {
        try {
            LocalDate targetDate = LocalDate.parse(dateStr);
            long endTs = targetDate.atStartOfDay(ZoneOffset.UTC).toEpochSecond() + 86400;
            long startTs = targetDate.minusDays(14).atStartOfDay(ZoneOffset.UTC).toEpochSecond();

            String url = baseUrl + "/v8/finance/chart/" + symbol + "?interval=1d&period1=" + startTs + "&period2=" + endTs;
            Map<String, Object> response = restClient.get().uri(url).retrieve().body(Map.class);

            if (response != null) {
                Map<String, Object> chart = (Map<String, Object>) response.get("chart");
                List<Map<String, Object>> result = (List<Map<String, Object>>) chart.get("result");
                if (result != null && !result.isEmpty()) {
                    /*
                     * [디버깅 구간 3] Can be replaced with 'getFirst()' call (과거 종가 파트)
                     * - 변경 이유: 데이터 구조 depth가 깊은 API 응답 특성상 무분별한 `get(0)`은 코드를 지저분하게 만듦. `.getFirst()`를 사용하여 코드 가독성을 대폭 개선.
                     */
                    List<Object> timestamps = (List<Object>) result.getFirst().get("timestamp");
                    List<Object> close = (List<Object>) ((List<Map<String, Object>>)
                            ((Map<String, Object>) result.getFirst().get("indicators")).get("quote"))
                            .getFirst().get("close");

                    if (timestamps != null && close != null) {
                        for (int i = timestamps.size() - 1; i >= 0; i--) {
                            if (close.get(i) != null) {
                                long ts = ((Number) timestamps.get(i)).longValue();
                                LocalDate priceDate = Instant.ofEpochSecond(ts).atZone(ZoneOffset.UTC).toLocalDate();

                                if (!priceDate.isAfter(targetDate)) {
                                    log.info("[Yahoo Finance] 요청일: {}, 매핑된 실제 영업일: {}, 가격: {}", targetDate, priceDate, close.get(i));
                                    return new BigDecimal(close.get(i).toString());
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Yahoo Finance] {} 날짜별 종가 API 통신 실패: {}", symbol, e.getMessage());
        }
        return BigDecimal.ZERO;
    }

    @SuppressWarnings("unchecked")
    public String fetchCompanyName(String ticker) {
        String symbol = convertToYahooSymbol(ticker);
        return companyNameCache.computeIfAbsent(symbol, s -> {
            try {
                String url = baseUrl + "/v8/finance/chart/" + s + "?interval=1d&range=1d";

                /*
                 * [디버깅 구간 4] Raw use of parameterized class 'Map'
                 * - 이전 문제점: 제네릭 정보가 전혀 없는 원시 타입(Raw Type) `Map`을 사용하여 컴파일러가 유효한 타입 체크를 하지 못하고 경고를 뱉음.
                 * - 변경 이유: 내부적으로 문자열 키와 오브젝트 밸류를 지니는 구조이므로 명확하게 `Map<String, Object>` 및 `List<Map<String, Object>>`로 선언하여 타입 안정성(Type Safety)을 확보함.
                 */
                Map<String, Object> response = restClient.get().uri(url).retrieve().body(Map.class);

                if (response != null) {
                    Map<String, Object> chart = (Map<String, Object>) response.get("chart");
                    if (chart != null) {
                        List<Map<String, Object>> result = (List<Map<String, Object>>) chart.get("result");
                        if (result != null && !result.isEmpty()) {
                            // 💡 추가적으로 get(0)도 .getFirst()로 변환 완료
                            Map<String, Object> meta = (Map<String, Object>) result.getFirst().get("meta");
                            if (meta != null) {
                                String shortName = (String) meta.get("shortName");
                                if (shortName != null && !shortName.isBlank()) return shortName;
                                String longName = (String) meta.get("longName");
                                if (longName != null && !longName.isBlank()) return longName;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[Yahoo Finance] {} 회사명 조회 실패: {}", s, e.getMessage());
            }
            return null;
        });
    }

    @SuppressWarnings("unchecked")
    public TreeMap<YearMonth, Double> fetchMonthlyPrices(String ticker, LocalDate start, LocalDate end) {
        String symbol = convertToYahooSymbol(ticker);
        TreeMap<YearMonth, Double> result = new TreeMap<>();
        try {
            long period1 = start.withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
            long period2 = end.withDayOfMonth(1).plusMonths(2).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
            String url = baseUrl + "/v8/finance/chart/" + symbol + "?interval=1mo&period1=" + period1 + "&period2=" + period2;

            Map<String, Object> response = restClient.get().uri(url).retrieve().body(Map.class);

            if (response != null) {
                Map<String, Object> chart = (Map<String, Object>) response.get("chart");
                List<Map<String, Object>> results = (List<Map<String, Object>>) chart.get("result");
                if (results != null && !results.isEmpty()) {
                    // 💡 get(0) -> getFirst() 변경 적용
                    List<Object> timestamps = (List<Object>) results.getFirst().get("timestamp");
                    Map<String, Object> indicators = (Map<String, Object>) results.getFirst().get("indicators");
                    List<Map<String, Object>> quoteList = (List<Map<String, Object>>) indicators.get("quote");
                    if (timestamps != null && quoteList != null && !quoteList.isEmpty()) {
                        List<Object> closes = (List<Object>) quoteList.getFirst().get("close");
                        for (int i = 0; i < timestamps.size(); i++) {
                            if (i < closes.size() && closes.get(i) != null) {
                                long ts = ((Number) timestamps.get(i)).longValue();
                                LocalDate date = Instant.ofEpochSecond(ts).atZone(ZoneOffset.UTC).toLocalDate();
                                result.put(YearMonth.from(date), ((Number) closes.get(i)).doubleValue());
                            }
                        }
                    }
                }
            }
            log.info("[Yahoo Finance] {} 월별 데이터 {}개 로드", symbol, result.size());
        } catch (Exception e) {
            log.error("[Yahoo Finance] {} 월별 가격 조회 실패: {}", symbol, e.getMessage());
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private BigDecimal fetchUsdKrwRate(String dateStr) {
        try {
            String url;
            if (dateStr != null) {
                LocalDate targetDate = LocalDate.parse(dateStr);
                long endTs = targetDate.atStartOfDay(ZoneOffset.UTC).toEpochSecond() + 86400;
                long startTs = targetDate.minusDays(14).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
                url = baseUrl + "/v8/finance/chart/USDKRW=X?interval=1d&period1=" + startTs + "&period2=" + endTs;
            } else {
                url = baseUrl + "/v8/finance/chart/USDKRW=X?interval=1d&range=1d";
            }

            Map<String, Object> response = restClient.get().uri(url).retrieve().body(Map.class);

            if (response != null) {
                Map<String, Object> chart = (Map<String, Object>) response.get("chart");
                List<Map<String, Object>> result = (List<Map<String, Object>>) chart.get("result");
                if (result != null && !result.isEmpty()) {
                    if (dateStr != null) {
                        // 💡 환율 연산 로직 내 모든 get(0) -> getFirst() 최적화 완료
                        List<Object> timestamps = (List<Object>) result.getFirst().get("timestamp");
                        List<Object> close = (List<Object>) ((List<Map<String, Object>>)
                                ((Map<String, Object>) result.getFirst().get("indicators")).get("quote"))
                                .getFirst().get("close");

                        if (timestamps != null && close != null) {
                            LocalDate targetDate = LocalDate.parse(dateStr);
                            for (int i = timestamps.size() - 1; i >= 0; i--) {
                                if (close.get(i) != null) {
                                    long ts = ((Number) timestamps.get(i)).longValue();
                                    LocalDate priceDate = Instant.ofEpochSecond(ts).atZone(ZoneOffset.UTC).toLocalDate();
                                    if (!priceDate.isAfter(targetDate)) {
                                        return new BigDecimal(close.get(i).toString());
                                    }
                                }
                            }
                        }
                    } else {
                        Object rate = ((Map<String, Object>) result.getFirst().get("meta")).get("regularMarketPrice");
                        if (rate != null) return new BigDecimal(rate.toString());
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Yahoo Finance] 환율 조회 실패: {}", e.getMessage());
        }
        return new BigDecimal("1350");
    }
}