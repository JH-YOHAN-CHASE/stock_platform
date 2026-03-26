package stock.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "index_components")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class IndexComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_index_id", nullable = false)
    private CustomIndex customIndex;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private IndicatorType indicatorType;

    @Column(nullable = false)
    private String indicatorName;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight;

    @Column(nullable = false)
    private Integer direction;  // 1 or -1

    private String description;

    private String dataSourceCode;

    public void update(BigDecimal weight, Integer direction, String description) {
        this.weight = weight;
        this.direction = direction;
        this.description = description;
    }

    public enum IndicatorType {
        INTEREST_RATE,
        EXCHANGE_RATE,
        OIL_PRICE,
        TARIFF,
        CPI,
        EMPLOYMENT,
        GDP,
        PMI,
        YIELD_CURVE,
        CUSTOM
    }
}
