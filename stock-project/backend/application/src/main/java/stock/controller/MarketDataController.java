package stock.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import stock.dto.ApiResponse;
import stock.service.MarketDataService;
import stock.service.StockResolverService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketDataController {

    private final MarketDataService marketDataService;
    private final StockResolverService stockResolver;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> searchStocks(@RequestParam String query) {
        return ResponseEntity.ok(ApiResponse.ok(stockResolver.search(query, 10)));
    }

    @GetMapping("/resolve")
    public ResponseEntity<ApiResponse<Map<String, String>>> resolveStock(@RequestParam String query) {
        StockResolverService.ResolvedStock resolved = stockResolver.resolve(query);
        String name = stockResolver.getName(resolved.ticker());

        if (name == null) {
            name = marketDataService.fetchCompanyName(resolved.ticker());
        }

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "ticker", resolved.ticker(),
                "name", name != null ? name : resolved.ticker(),
                "type", resolved.type().name()
        )));
    }

    @GetMapping("/price")
    public ResponseEntity<ApiResponse<BigDecimal>> getCurrentPrice(@RequestParam String ticker) {
        BigDecimal price = marketDataService.getClosingPrice(ticker);
        return ResponseEntity.ok(ApiResponse.ok(price));
    }

    @GetMapping("/price/raw")
    public ResponseEntity<ApiResponse<BigDecimal>> getRawPrice(
            @RequestParam String ticker,
            @RequestParam(required = false) String date) {
        BigDecimal price = date != null
                ? marketDataService.getRawPriceByDate(ticker, date)
                : marketDataService.getRawPrice(ticker);
        return ResponseEntity.ok(ApiResponse.ok(price));
    }

    @GetMapping("/price/history")
    public ResponseEntity<ApiResponse<BigDecimal>> getHistoricalPrice(
            @RequestParam String ticker,
            @RequestParam String date) {
        // [수정] 서비스가 내부적으로 '해당 날짜' 또는 '그 직전 가장 최신 영업일'의 종가를 알아서 찾아옵니다.
        BigDecimal price = marketDataService.getClosingPriceByDate(ticker, date);
        return ResponseEntity.ok(ApiResponse.ok(price));
    }
}
