package stock.repository;

import stock.entity.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, Long> {

    List<PortfolioItem> findByPortfolioId(Long portfolioId);

    // deleteBy 파생 쿼리는 @Modifying + @Transactional 명시 필요
    @Modifying
    @Transactional
    @Query("DELETE FROM PortfolioItem pi WHERE pi.portfolio.id = :portfolioId")
    void deleteByPortfolioId(@Param("portfolioId") Long portfolioId);
}
