package stock.converter;

import stock.entity.CustomIndex;
import stock.entity.IndexComponent;
import stock.entity.User;
import org.springframework.stereotype.Component;
import stock.dto.CustomIndexDto;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class CustomIndexConverter {

    public CustomIndex toEntity(CustomIndexDto.CreateRequest request, User user) {
        CustomIndex index = CustomIndex.builder()
                .user(user)
                .name(request.getName())
                .description(request.getDescription())
                .isPublic(request.isPublic())
                .build();

        if (request.getComponents() != null) {
            request.getComponents().forEach(compReq -> {
                IndexComponent component = toComponentEntity(compReq, index);
                index.getComponents().add(component);
            });
        }

        return index;
    }

    public IndexComponent toComponentEntity(CustomIndexDto.ComponentRequest request, CustomIndex index) {
        return IndexComponent.builder()
                .customIndex(index)
                .indicatorType(request.getIndicatorType())
                .indicatorName(request.getIndicatorName().trim())
                .weight(request.getWeight())
                .direction(request.getDirection())
                .description(request.getDescription())
                .dataSourceCode(request.getDataSourceCode())
                .build();
    }

    public CustomIndexDto.Response toResponse(CustomIndex index) {
        List<CustomIndexDto.ComponentResponse> componentResponses = index.getComponents().stream()
                .map(this::toComponentResponse)
                .collect(Collectors.toList());

        return CustomIndexDto.Response.builder()
                .id(index.getId())
                .userId(index.getUser().getId())
                .userName(index.getUser().getName())
                .name(index.getName())
                .description(index.getDescription())
                .isPublic(index.isPublic())
                .components(componentResponses)
                .createdAt(index.getCreatedAt())
                .updatedAt(index.getUpdatedAt())
                .build();
    }

    public CustomIndexDto.ComponentResponse toComponentResponse(IndexComponent component) {
        return CustomIndexDto.ComponentResponse.builder()
                .id(component.getId())
                .indicatorType(component.getIndicatorType())
                .indicatorName(component.getIndicatorName())
                .weight(component.getWeight())
                .direction(component.getDirection())
                .description(component.getDescription())
                .dataSourceCode(component.getDataSourceCode())
                .build();
    }

    public CustomIndexDto.SummaryResponse toSummaryResponse(CustomIndex index) {
        return CustomIndexDto.SummaryResponse.builder()
                .id(index.getId())
                .userId(index.getUser().getId())
                .userName(index.getUser().getName())
                .name(index.getName())
                .description(index.getDescription())
                .isPublic(index.isPublic())
                .componentCount(index.getComponents().size())
                .createdAt(index.getCreatedAt())
                .build();
    }
}
