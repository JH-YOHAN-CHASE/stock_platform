package stock.converter;

import stock.entity.Tag;
import org.springframework.stereotype.Component;
import stock.dto.TagDto;

@Component
public class TagConverter {

    public Tag toEntity(TagDto.CreateRequest request) {
        return Tag.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .build();
    }

    public TagDto.Response toResponse(Tag tag) {
        return TagDto.Response.builder()
                .id(tag.getId())
                .name(tag.getName())
                .description(tag.getDescription())
                .build();
    }
}
