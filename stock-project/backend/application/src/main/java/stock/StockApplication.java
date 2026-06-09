package stock;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.TimeZone;

@SpringBootApplication
public class StockApplication {

    public static void main(String[] args) {

        SpringApplication.run(StockApplication.class, args);


    }
    //이제 무조건 서울기준으로 원래는 aws쓰느라 영국시간으로 되었어
    @PostConstruct
    public void started()
    {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
    }

}
