import api from './client';

export const aiApi = {
    /**
     * AI 시뮬레이션 실행 API
     * 백엔드의 @PostMapping("/api/ai/simulation") 와 연결됩니다.
     */
    runAiSimulation: async (portfolioId: number, indexId: number) => {
        // 백엔드가 @RequestBody로 데이터를 받으므로, POST 요청의 Body에 객체 형태로 담아 보냅니다.
        const response = await api.post('/ai/simulation', {
            portfolioId: portfolioId,
            indexId: indexId
        });

        // 백엔드 컨트롤러를 보면 ApiResponse.ok("...", result) 형태로 감싸서 반환하고 있습니다.
        // 따라서 실제 데이터는 response.data.data 에 들어있을 확률이 높습니다.
        // 만약 바로 객체가 온다면 response.data 를 반환하도록 방어 코드를 작성합니다.
        return response.data?.data || response.data;
    }
};