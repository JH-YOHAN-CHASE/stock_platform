package stock.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import stock.dto.ApiResponse;
import stock.service.MarketDataService;
import stock.service.StockResolverService;
import stock.service.StockResolverService.ResolvedStock;
import stock.service.StockResolverService.StockType;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketDataController {

    private final MarketDataService marketDataService;
    private final StockResolverService stockResolver;

    @GetMapping("/resolve")
    public ResponseEntity<ApiResponse<Map<String, String>>> resolveStock(@RequestParam String query) {
        StockResolverService.ResolvedStock resolved = stockResolver.resolve(query);
        String name = stockResolver.getName(resolved.ticker());
        if (name == null && resolved.type() == StockType.US) {
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
        ResolvedStock resolved = stockResolver.resolve(ticker);
        BigDecimal price = switch (resolved.type()) {
            case KOREAN -> marketDataService.getClosingPrice(resolved.ticker());
            case US     -> marketDataService.getUsClosingPrice(resolved.ticker());
            default     -> BigDecimal.ZERO;
        };
        return ResponseEntity.ok(ApiResponse.ok(price));
    }

    @GetMapping("/price/history")
    public ResponseEntity<ApiResponse<BigDecimal>> getHistoricalPrice(
            @RequestParam String ticker,
            @RequestParam String date) {
        ResolvedStock resolved = stockResolver.resolve(ticker);
        BigDecimal price = switch (resolved.type()) {
            case KOREAN -> marketDataService.getClosingPriceByDate(resolved.ticker(), date);
            case US     -> marketDataService.getUsClosingPriceByDate(resolved.ticker(), date);
            default     -> BigDecimal.ZERO;
        };
        // 날짜 데이터 없으면 (오늘 장 미마감 등) 현재가로 폴백
        if (price.compareTo(BigDecimal.ZERO) == 0) {
            price = switch (resolved.type()) {
                case KOREAN -> marketDataService.getClosingPrice(resolved.ticker());
                case US     -> marketDataService.getUsClosingPrice(resolved.ticker());
                default     -> BigDecimal.ZERO;
            };
        }
        return ResponseEntity.ok(ApiResponse.ok(price));
    }
}