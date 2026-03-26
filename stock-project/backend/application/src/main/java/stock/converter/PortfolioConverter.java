package stock.converter;

import stock.entity.Portfolio;
import stock.entity.PortfolioItem;
import stock.entity.User;
import org.springframework.stereotype.Component;
import stock.dto.PortfolioDto;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PortfolioConverter {

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
        return PortfolioItem.builder()
                .portfolio(portfolio)
                .ticker(request.getTicker().toUpperCase().trim())
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
        return PortfolioDto.ItemResponse.builder()
                .id(item.getId())
                .ticker(item.getTicker())
                .stockName(item.getStockName())
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
