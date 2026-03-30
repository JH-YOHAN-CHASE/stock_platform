package stock.service;

import stock.entity.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import stock.repository.TagRepository;
import stock.converter.TagConverter;
import stock.dto.TagDto;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TagService {

    private final TagRepository tagRepository;
    private final TagConverter tagConverter;

    public List<TagDto.Response> getAllTags() {
        return tagRepository.findAll().stream()
                .map(tagConverter::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TagDto.Response createTag(TagDto.CreateRequest request) {
        if (tagRepository.existsByName(request.getName().trim())) {
            throw new IllegalArgumentException("이미 존재하는 태그: " + request.getName());
        }
        Tag tag = tagConverter.toEntity(request);
        return tagConverter.toResponse(tagRepository.save(tag));
    }
}
