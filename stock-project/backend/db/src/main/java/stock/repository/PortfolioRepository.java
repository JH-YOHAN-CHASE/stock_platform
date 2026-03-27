package stock.repository;

import stock.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface PortfolioRepository extends JpaRepository<Portfolio, Long> {

    List<Portfolio> findByUserId(Long userId);

    //@Query("SELECT p FROM Portfolio p JOIN FETCH p.user WHERE p.isPublic = true AND p.user.id != :userId")
    //List<Portfolio> findPublicPortfoliosExcludingUser(@Param("userId") Long userId);

    @Query("SELECT p FROM Portfolio p JOIN FETCH p.user WHERE p.isPublic = true")
    List<Portfolio> findAllPublicPortfolios();

    Optional<Portfolio> findByIdAndUserId(Long id, Long userId);

    List<Portfolio> findByUserIdAndIsPublicTrue(Long userId);
}
