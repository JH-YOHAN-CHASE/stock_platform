package stock.repository;

import stock.entity.CustomIndex;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface CustomIndexRepository extends JpaRepository<CustomIndex, Long> {

    List<CustomIndex> findByUserId(Long userId);

    @Query("SELECT ci FROM CustomIndex ci JOIN FETCH ci.user WHERE ci.isPublic = true")
    List<CustomIndex> findAllPublic();

    @Query("SELECT ci FROM CustomIndex ci JOIN FETCH ci.user WHERE ci.isPublic = true OR ci.user.id = :userId")
    List<CustomIndex> findAccessible(@Param("userId") Long userId);

    Optional<CustomIndex> findByIdAndUserId(Long id, Long userId);
}
