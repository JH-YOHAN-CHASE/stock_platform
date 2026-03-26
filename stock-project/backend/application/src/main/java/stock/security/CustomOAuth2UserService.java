package stock.security;

import stock.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import stock.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();

        OAuth2UserInfo userInfo = OAuth2UserInfo.of(registrationId, oAuth2User.getAttributes());
        User user = saveOrUpdate(userInfo);

        Map<String, Object> attributes = Map.of(
                "userId", user.getId(),
                "email",  user.getEmail(),
                "name",   user.getName()
        );

        return new DefaultOAuth2User(List.of(), attributes, "email");
    }

    private User saveOrUpdate(OAuth2UserInfo userInfo) {
        Optional<User> existing = userRepository
                .findByProviderAndProviderId(userInfo.getProvider(), userInfo.getProviderId());

        if (existing.isPresent()) {
            User user = existing.get();
            user.updateProfile(userInfo.getName(), userInfo.getProfileImage());
            return userRepository.save(user);
        }

        return userRepository.save(User.builder()
                .email(userInfo.getEmail())
                .name(userInfo.getName())
                .profileImage(userInfo.getProfileImage())
                .provider(userInfo.getProvider())
                .providerId(userInfo.getProviderId())
                .build());
    }
}
