package stock.converter;

import stock.entity.Portfolio;
import stock.entity.PortfolioItem;
import stock.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import stock.dto.PortfolioDto;
import stock.service.StockResolverService;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class PortfolioConverter {

    private final StockResolverService stockResolverService;

    // CreateRequest → Portfolio Entity
    public Portfolio toEntity(PortfolioDto.CreateRequest request, User user) {
        Portfolio portfolio = Portfolio.builder()
                .user(user)
                .name(request.getName())
                .description(request.getDescription())
                .isPublic(request.isPublic())
                .build();

        if (request.getItems() != null) {
            request.getItems().forEach(itemReq -> {
                PortfolioItem item = toItemEntity(itemReq, portfolio);
                portfolio.getItems().add(item);
            });
        }

        return portfolio;
    }

    // ItemRequest → PortfolioItem Entity
    public PortfolioItem toItemEntity(PortfolioDto.ItemRequest request, Portfolio portfolio) {
        String resolvedTicker = stockResolverService.resolve(request.getTicker()).ticker();
        return PortfolioItem.builder()
                .portfolio(portfolio)
                .ticker(resolvedTicker)
                .stockName(request.getStockName().trim())
                .quantity(request.getQuantity())
                .avgBuyPrice(request.getAvgBuyPrice())
                .purchaseDate(request.getPurchaseDate())
                .weight(request.getWeight())
                .build();
    }

    // Portfolio Entity → Response DTO
    public PortfolioDto.Response toResponse(Portfolio portfolio) {
        List<PortfolioDto.ItemResponse> itemResponses = portfolio.getItems().stream()
                .map(this::toItemResponse)
                .collect(Collectors.toList());

        return PortfolioDto.Response.builder()
                .id(portfolio.getId())
                .userId(portfolio.getUser().getId())
                .userName(portfolio.getUser().getName())
                .name(portfolio.getName())
                .description(portfolio.getDescription())
                .isPublic(portfolio.isPublic())
                .items(itemResponses)
                .createdAt(portfolio.getCreatedAt())
                .updatedAt(portfolio.getUpdatedAt())
                .build();
    }

    public PortfolioDto.ItemResponse toItemResponse(PortfolioItem item) {
        // 영문 이름으로 저장된 국내 종목(예: "NAVER")을 종목코드("035420")로 변환
        StockResolverService.ResolvedStock resolved = stockResolverService.resolve(item.getTicker());
        String ticker = (resolved.type() == StockResolverService.StockType.KOREAN)
                ? resolved.ticker()
                : item.getTicker();

        String stockName = item.getStockName();
        if (stockName == null || stockName.equalsIgnoreCase(item.getTicker())) {
            String name = stockResolverService.getName(ticker);
            if (name == null && resolved.type() == StockResolverService.StockType.US) {
                name = stockResolverService.getName(item.getTicker());
            }
            if (name != null) stockName = name;
        }
        return PortfolioDto.ItemResponse.builder()
                .id(item.getId())
                .ticker(ticker)
                .stockName(stockName)
                .quantity(item.getQuantity())
                .avgBuyPrice(item.getAvgBuyPrice())
                .purchaseDate(item.getPurchaseDate())
                .weight(item.getWeight())
                .build();
    }

    // Portfolio Entity → SummaryResponse DTO
    public PortfolioDto.SummaryResponse toSummaryResponse(Portfolio portfolio) {
        return PortfolioDto.SummaryResponse.builder()
                .id(portfolio.getId())
                .userId(portfolio.getUser().getId())
                .userName(portfolio.getUser().getName())
                .name(portfolio.getName())
                .description(portfolio.getDescription())
                .isPublic(portfolio.isPublic())
                .itemCount(portfolio.getItems().size())
                .createdAt(portfolio.getCreatedAt())
                .build();
    }
}
