package stock.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "chatTaskExecutor")
    public Executor chatTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 기본 핵심 스레드 수 (동시 유입 대비 고정 확보 스레드)
        executor.setCorePoolSize(30);
        // 최대 스레드 수 (순간 트래픽 폭증 시 확장 반경)
        executor.setMaxPoolSize(100);
        // 스레드 풀 큐 용량 (스레드가 꽉 찼을 때 대기하는 작업 메모리 공간)
        executor.setQueueCapacity(500);
        // 스레드 이름 접두사
        executor.setThreadNamePrefix("ChatAsync-");
        executor.initialize();
        return executor;
    }
}