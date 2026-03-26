package stock.service;

import stock.entity.Portfolio;
import stock.entity.PortfolioItem;
import stock.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import stock.repository.PortfolioItemRepository;
import stock.repository.PortfolioRepository;
import stock.converter.PortfolioConverter;
import stock.dto.PortfolioDto;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final PortfolioConverter portfolioConverter;
    private final UserService userService;

    // 내 포트폴리오 목록
    public List<PortfolioDto.SummaryResponse> getMyPortfolios(Long userId) {
        return portfolioRepository.findByUserId(userId).stream()
                .map(portfolioConverter::toSummaryResponse)
                .collect(Collectors.toList());
    }

    // 포트폴리오 상세 (본인 or 공개)
    public PortfolioDto.Response getPortfolio(Long portfolioId, Long userId) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new IllegalArgumentException("포트폴리오를 찾을 수 없습니다"));

        if (!portfolio.isPublic() && !portfolio.getUser().getId().equals(userId)) {
            throw new SecurityException("접근 권한이 없습니다");
        }

        return portfolioConverter.toResponse(portfolio);
    }

    // 공개 포트폴리오 목록 (비교용)
    public List<PortfolioDto.SummaryResponse> getPublicPortfolios(Long userId) {
        return portfolioRepository.findPublicPortfoliosExcludingUser(userId).stream()
                .map(portfolioConverter::toSummaryResponse)
                .collect(Collectors.toList());
    }

    // 포트폴리오 생성
    @Transactional
    public PortfolioDto.Response createPortfolio(PortfolioDto.CreateRequest request, Long userId) {
        User user = userService.getById(userId);
        Portfolio portfolio = portfolioConverter.toEntity(request, user);
        Portfolio saved = portfolioRepository.save(portfolio);
        return portfolioConverter.toResponse(saved);
    }

    // 포트폴리오 수정
    @Transactional
    public PortfolioDto.Response updatePortfolio(Long portfolioId, PortfolioDto.UpdateRequest request, Long userId) {
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new IllegalArgumentException("포트폴리오를 찾을 수 없거나 권한이 없습니다"));

        // 기존 종목 제거 후 재등록
        portfolio.getItems().clear();
        portfolioItemRepository.deleteByPortfolioId(portfolioId);

        portfolio.update(request.getName(), request.getDescription(), request.isPublic());

        if (request.getItems() != null) {
            request.getItems().forEach(itemReq -> {
                PortfolioItem item = portfolioConverter.toItemEntity(itemReq, portfolio);
                portfolio.getItems().add(item);
            });
        }

        return portfolioConverter.toResponse(portfolioRepository.save(portfolio));
    }

    // 포트폴리오 삭제
    @Transactional
    public void deletePortfolio(Long portfolioId, Long userId) {
        Portfolio portfolio = portfolioRepository.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new IllegalArgumentException("포트폴리오를 찾을 수 없거나 권한이 없습니다"));
        portfolioRepository.delete(portfolio);
    }

    // 비교용: 두 포트폴리오 동시 조회
    public List<PortfolioDto.Response> comparePortfolios(List<Long> portfolioIds, Long userId) {
        return portfolioIds.stream()
                .map(id -> getPortfolio(id, userId))
                .collect(Collectors.toList());
    }
}
