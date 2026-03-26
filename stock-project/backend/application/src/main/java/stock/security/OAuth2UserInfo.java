package stock.security;

import stock.entity.User;

import java.util.Map;

public abstract class OAuth2UserInfo {

    protected final Map<String, Object> attributes;

    protected OAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    public abstract String getProviderId();
    public abstract String getEmail();
    public abstract String getName();
    public abstract String getProfileImage();
    public abstract User.OAuthProvider getProvider();

    public static OAuth2UserInfo of(String registrationId, Map<String, Object> attributes) {
        return switch (registrationId.toLowerCase()) {
            case "google" -> new GoogleUserInfo(attributes);
            case "naver"  -> new NaverUserInfo(attributes);
            default -> throw new IllegalArgumentException("지원하지 않는 OAuth2 공급자: " + registrationId);
        };
    }

    // ── Google ───────────────────────────────────────────────
    static class GoogleUserInfo extends OAuth2UserInfo {
        GoogleUserInfo(Map<String, Object> attributes) { super(attributes); }

        @Override public String getProviderId()    { return (String) attributes.get("sub"); }
        @Override public String getEmail()         { return (String) attributes.get("email"); }
        @Override public String getName()          { return (String) attributes.get("name"); }
        @Override public String getProfileImage()  { return (String) attributes.get("picture"); }
        @Override public User.OAuthProvider getProvider() { return User.OAuthProvider.GOOGLE; }
    }

    // ── Naver ────────────────────────────────────────────────
    @SuppressWarnings("unchecked")
    static class NaverUserInfo extends OAuth2UserInfo {
        NaverUserInfo(Map<String, Object> attributes) { super(attributes); }

        private Map<String, Object> getResponse() {
            return (Map<String, Object>) attributes.get("response");
        }

        @Override public String getProviderId()    { return (String) getResponse().get("id"); }
        @Override public String getEmail()         { return (String) getResponse().get("email"); }
        @Override public String getName()          { return (String) getResponse().get("name"); }
        @Override public String getProfileImage()  { return (String) getResponse().get("profile_image"); }
        @Override public User.OAuthProvider getProvider() { return User.OAuthProvider.NAVER; }
    }
}
