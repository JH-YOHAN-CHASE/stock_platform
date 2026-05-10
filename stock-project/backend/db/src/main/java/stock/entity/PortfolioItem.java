package stock.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "portfolio_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class PortfolioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @Column(nullable = false)
    private String ticker;

    @Column(nullable = false)
    private String stockName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal avgBuyPrice;

    private LocalDate purchaseDate;

    @Column(precision = 5, scale = 2)
    private BigDecimal weight;

    public void update(Integer quantity, BigDecimal avgBuyPrice, LocalDate purchaseDate) {
        this.quantity = quantity;
        this.avgBuyPrice = avgBuyPrice;
        this.purchaseDate = purchaseDate;
    }
}
