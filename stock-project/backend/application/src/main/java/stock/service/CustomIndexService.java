package stock.service;

import stock.entity.CustomIndex;
import stock.entity.IndexComponent;
import stock.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import stock.repository.CustomIndexRepository;
import stock.converter.CustomIndexConverter;
import stock.dto.CustomIndexDto;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomIndexService {

    private final CustomIndexRepository customIndexRepository;
    private final CustomIndexConverter customIndexConverter;
    private final UserService userService;

    // 내 지수 목록
    public List<CustomIndexDto.SummaryResponse> getMyIndexes(Long userId) {
        return customIndexRepository.findByUserId(userId).stream()
                .map(customIndexConverter::toSummaryResponse)
                .collect(Collectors.toList());
    }

    // 공개 지수 목록 (타인 것 포함)
    public List<CustomIndexDto.SummaryResponse> getPublicIndexes() {
        return customIndexRepository.findAllPublic().stream()
                .map(customIndexConverter::toSummaryResponse)
                .collect(Collectors.toList());
    }

    // 접근 가능한 지수 목록 (내 것 + 공개)
    public List<CustomIndexDto.SummaryResponse> getAccessibleIndexes(Long userId) {
        return customIndexRepository.findAccessible(userId).stream()
                .map(customIndexConverter::toSummaryResponse)
                .collect(Collectors.toList());
    }

    // 지수 상세 조회
    public CustomIndexDto.Response getIndex(Long indexId, Long userId) {
        CustomIndex index = customIndexRepository.findById(indexId)
                .orElseThrow(() -> new IllegalArgumentException("지수를 찾을 수 없습니다"));

        if (!index.isPublic() && !index.getUser().getId().equals(userId)) {
            throw new SecurityException("접근 권한이 없습니다");
        }

        return customIndexConverter.toResponse(index);
    }

    // 지수 생성
    @Transactional
    public CustomIndexDto.Response createIndex(CustomIndexDto.CreateRequest request, Long userId) {
        validateWeights(request.getComponents());

        User user = userService.getById(userId);
        CustomIndex index = customIndexConverter.toEntity(request, user);
        return customIndexConverter.toResponse(customIndexRepository.save(index));
    }

    // 지수 수정
    @Transactional
    public CustomIndexDto.Response updateIndex(Long indexId, CustomIndexDto.UpdateRequest request, Long userId) {
        validateWeights(request.getComponents());

        CustomIndex index = customIndexRepository.findByIdAndUserId(indexId, userId)
                .orElseThrow(() -> new IllegalArgumentException("지수를 찾을 수 없거나 권한이 없습니다"));

        index.getComponents().clear();
        index.update(request.getName(), request.getDescription(), request.isPublic());

        request.getComponents().forEach(compReq -> {
            IndexComponent component = customIndexConverter.toComponentEntity(compReq, index);
            index.getComponents().add(component);
        });

        return customIndexConverter.toResponse(customIndexRepository.save(index));
    }

    // 지수 삭제
    @Transactional
    public void deleteIndex(Long indexId, Long userId) {
        CustomIndex index = customIndexRepository.findByIdAndUserId(indexId, userId)
                .orElseThrow(() -> new IllegalArgumentException("지수를 찾을 수 없거나 권한이 없습니다"));
        customIndexRepository.delete(index);
    }

    // 가중치 합계 검증 (100이어야 함)
    private void validateWeights(List<? extends stock.dto.CustomIndexDto.ComponentRequest> components) {
        if (components == null || components.isEmpty()) return;
        BigDecimal total = components.stream()
                .map(stock.dto.CustomIndexDto.ComponentRequest::getWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (total.compareTo(new BigDecimal("100")) != 0) {
            throw new IllegalArgumentException("지표 가중치 합계는 100이어야 합니다. 현재: " + total);
        }
    }
}
