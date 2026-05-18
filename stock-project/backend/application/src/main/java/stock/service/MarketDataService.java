package stock.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

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
    private final Map<String, String> companyNameCache = new ConcurrentHashMap<>();

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

    public BigDecimal getClosingPriceByDate(String ticker, String date) {
        // 요청일로부터 최대 7일 전까지 범위로 조회 — 주말/공휴일이면 직전 거래일 종가 반환
        String startKisDate = LocalDate.parse(date).minusDays(6).toString().replace("-", "");
        String endKisDate = date.replace("-", "");
        log.info("[외부 API 호출] {} 종목 {}~{} 범위 종가를 요청합니다.", ticker, startKisDate, endKisDate);
        try {
            String token = getAccessToken();
            String url = apiUrl + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
                    + "?FID_COND_MRKT_DIV_CODE=J"
                    + "&FID_INPUT_ISCD=" + ticker
                    + "&FID_INPUT_DATE_1=" + startKisDate
                    + "&FID_INPUT_DATE_2=" + endKisDate
                    + "&FID_PERIOD_DIV_CODE=D"
                    + "&FID_ORG_ADJ_PRC=0";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("authorization", "Bearer " + token);
            headers.set("appkey", appKey);
            headers.set("appsecret", appSecret);
            headers.set("tr_id", "FHKST03010100");

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> output2 = (List<Map<String, Object>>) response.getBody().get("output2");
                if (output2 != null) {
                    for (Map<String, Object> row : output2) {
                        String price = (String) row.get("stck_clpr");
                        if (price != null && !price.isBlank() && !price.equals("0")) {
                            BigDecimal result = new BigDecimal(price);
                            log.info("[KIS API] {} 종가 조회 성공: {}원 ({})", ticker, result, row.get("stck_bsop_date"));
                            return result;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[KIS API] {} 날짜별 종가 조회 실패: {}", ticker, e.getMessage());
        }
        return BigDecimal.ZERO;
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

    public BigDecimal getUsClosingPrice(String ticker) {
        log.info("[Yahoo Finance] 미국 주식 {} 현재가를 요청합니다.", ticker);
        BigDecimal usdPrice = fetchYahooCurrentPrice(ticker);
        if (usdPrice.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        BigDecimal rate = fetchUsdKrwRate("1d", null);
        BigDecimal krw = usdPrice.multiply(rate).setScale(0, java.math.RoundingMode.HALF_UP);
        log.info("[Yahoo Finance] {} ${} × {}원 = {}원", ticker, usdPrice, rate.setScale(0, java.math.RoundingMode.HALF_UP), krw);
        return krw;
    }

    public BigDecimal getUsClosingPriceByDate(String ticker, String date) {
        log.info("[Yahoo Finance] 미국 주식 {} {} 날짜 종가를 요청합니다.", ticker, date);
        BigDecimal usdPrice = fetchYahooPriceByDate(ticker, date);
        if (usdPrice.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        BigDecimal rate = fetchUsdKrwRate(null, date);
        BigDecimal krw = usdPrice.multiply(rate).setScale(0, java.math.RoundingMode.HALF_UP);
        log.info("[Yahoo Finance] {} ${} × {}원 = {}원 ({})", ticker, usdPrice, rate.setScale(0, java.math.RoundingMode.HALF_UP), krw, date);
        return krw;
    }

    @SuppressWarnings("unchecked")
    public String fetchCompanyName(String ticker) {
        return companyNameCache.computeIfAbsent(ticker.toUpperCase(), t -> {
            try {
                String url = "https://query2.finance.yahoo.com/v8/finance/chart/" + t + "?interval=1d&range=1d";
                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "Mozilla/5.0");
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    Map chart = (Map) response.getBody().get("chart");
                    if (chart != null) {
                        List<Map> result = (List<Map>) chart.get("result");
                        if (result != null && !result.isEmpty()) {
                            Map meta = (Map) result.get(0).get("meta");
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
                log.warn("[Yahoo Finance] {} 회사명 조회 실패: {}", t, e.getMessage());
            }
            return null;
        });
    }

    @SuppressWarnings("unchecked")
    private BigDecimal fetchYahooCurrentPrice(String ticker) {
        try {
            String url = "https://query2.finance.yahoo.com/v8/finance/chart/" + ticker + "?interval=1d&range=1d";
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> chart = (Map<String, Object>) response.getBody().get("chart");
                List<Map<String, Object>> result = (List<Map<String, Object>>) chart.get("result");
                if (result != null && !result.isEmpty()) {
                    Object price = ((Map<String, Object>) result.get(0).get("meta")).get("regularMarketPrice");
                    if (price != null) return new BigDecimal(price.toString());
                }
            }
        } catch (Exception e) {
            log.error("[Yahoo Finance] {} 현재가 조회 실패: {}", ticker, e.getMessage());
        }
        return BigDecimal.ZERO;
    }

    @SuppressWarnings("unchecked")
    private BigDecimal fetchYahooPriceByDate(String ticker, String date) {
        // 요청일로부터 최대 7일 전까지 범위로 조회 — 주말/공휴일이면 직전 거래일 종가 반환
        try {
            long endTs = LocalDate.parse(date).atStartOfDay(ZoneOffset.UTC).toEpochSecond() + 86400;
            long startTs = LocalDate.parse(date).minusDays(6).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
            String url = "https://query2.finance.yahoo.com/v8/finance/chart/" + ticker
                    + "?interval=1d&period1=" + startTs + "&period2=" + endTs;
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> chart = (Map<String, Object>) response.getBody().get("chart");
                List<Map<String, Object>> result = (List<Map<String, Object>>) chart.get("result");
                if (result != null && !result.isEmpty()) {
                    List<Object> close = (List<Object>) ((List<Map<String, Object>>)
                            ((Map<String, Object>) result.get(0).get("indicators")).get("quote"))
                            .get(0).get("close");
                    if (close != null) {
                        // 가장 최근 거래일(마지막 non-null) 종가 반환
                        for (int i = close.size() - 1; i >= 0; i--) {
                            if (close.get(i) != null)
                                return new BigDecimal(close.get(i).toString());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Yahoo Finance] {} 날짜별 종가 조회 실패: {}", ticker, e.getMessage());
        }
        return BigDecimal.ZERO;
    }

    @SuppressWarnings("unchecked")
    public TreeMap<YearMonth, Double> fetchMonthlyPrices(String yahooSymbol, LocalDate start, LocalDate end) {
        TreeMap<YearMonth, Double> result = new TreeMap<>();
        try {
            long period1 = start.withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
            long period2 = end.withDayOfMonth(1).plusMonths(2).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
            String url = "https://query2.finance.yahoo.com/v8/finance/chart/" + yahooSymbol
                    + "?interval=1mo&period1=" + period1 + "&period2=" + period2;
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> chart = (Map<String, Object>) response.getBody().get("chart");
                List<Map<String, Object>> results = (List<Map<String, Object>>) chart.get("result");
                if (results != null && !results.isEmpty()) {
                    List<Object> timestamps = (List<Object>) results.get(0).get("timestamp");
                    Map<String, Object> indicators = (Map<String, Object>) results.get(0).get("indicators");
                    List<Map<String, Object>> quoteList = (List<Map<String, Object>>) indicators.get("quote");
                    if (timestamps != null && quoteList != null && !quoteList.isEmpty()) {
                        List<Object> closes = (List<Object>) quoteList.get(0).get("close");
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
            log.info("[Yahoo Finance] {} 월별 데이터 {}개 로드", yahooSymbol, result.size());
        } catch (Exception e) {
            log.error("[Yahoo Finance] {} 월별 가격 조회 실패: {}", yahooSymbol, e.getMessage());
        }
        return result;
    }

    // date가 있으면 해당 날짜 환율(주말/공휴일이면 직전 거래일), 없으면 현재 환율
    @SuppressWarnings("unchecked")
    private BigDecimal fetchUsdKrwRate(String range, String date) {
        try {
            String url;
            if (date != null) {
                long endTs = LocalDate.parse(date).atStartOfDay(ZoneOffset.UTC).toEpochSecond() + 86400;
                long startTs = LocalDate.parse(date).minusDays(6).atStartOfDay(ZoneOffset.UTC).toEpochSecond();
                url = "https://query2.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&period1=" + startTs + "&period2=" + endTs;
            } else {
                url = "https://query2.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=1d";
            }
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0");
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> chart = (Map<String, Object>) response.getBody().get("chart");
                List<Map<String, Object>> result = (List<Map<String, Object>>) chart.get("result");
                if (result != null && !result.isEmpty()) {
                    if (date != null) {
                        // 날짜 지정 시 — 가장 최근 거래일 종가 사용
                        List<Object> close = (List<Object>) ((List<Map<String, Object>>)
                                ((Map<String, Object>) result.get(0).get("indicators")).get("quote"))
                                .get(0).get("close");
                        if (close != null) {
                            for (int i = close.size() - 1; i >= 0; i--) {
                                if (close.get(i) != null) return new BigDecimal(close.get(i).toString());
                            }
                        }
                    } else {
                        // 현재 환율
                        Object rate = ((Map<String, Object>) result.get(0).get("meta")).get("regularMarketPrice");
                        if (rate != null) return new BigDecimal(rate.toString());
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Yahoo Finance] 환율 조회 실패: {}", e.getMessage());
        }
        return new BigDecimal("1350"); // 조회 실패 시 기본값
    }
}