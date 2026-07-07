import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY environment variable is not set. Please configure it in your Secrets / Environment Variables.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

app.use(express.json());

// API: CS Response Generation
app.post("/api/cs/validate-key", async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      res.status(400).json({ error: "API Key가 전달되지 않았습니다." });
      return;
    }
    
    // Test the API key with a very simple call
    const testAi = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    
    const response = await testAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hi, reply with exactly the word OK",
    });
    
    if (response.text && response.text.trim().includes("OK")) {
      res.json({ success: true, message: "API Key가 정상적으로 인증되었습니다!" });
    } else {
      res.json({ success: true, message: "인증에 성공했으나 예상치 못한 응답이 왔습니다." });
    }
  } catch (error: any) {
    console.error("API Key Validation Error:", error);
    res.status(401).json({ success: false, error: "유효하지 않은 API Key이거나 네트워크 오류가 발생했습니다.", details: error.message });
  }
});

app.post("/api/cs/generate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, summary, request, specialNotes, preferredFormat } = req.body;
    const userApiKey = req.headers["x-gemini-api-key"] as string | undefined;
    const finalApiKey = userApiKey || process.env.GEMINI_API_KEY || "";

    if (!finalApiKey) {
      res.status(400).json({ error: "Gemini API Key가 구성되어 있지 않습니다. 서비스 이용을 위해 API Key를 먼저 입력 및 등록해 주세요." });
      return;
    }

    const activeAi = new GoogleGenAI({
      apiKey: finalApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `
당신은 편의점 및 프랜차이즈 가맹점 관리에 특화된 고객 중심(Customer-centric) 전문 영업관리 CS 어시스턴트입니다.
표면적 불만이나 요구사항 접수를 넘어, 점주와 거래처의 숨겨진 니즈(Hidden Needs) — 매출 타격, 본사와의 신뢰, 고객 이탈 우려 등 —를 선제적으로 파악하여 감정적 스트레스를 줄이고 원활한 합의점을 도출합니다.

다음 단계를 거쳐 구조화된 응대 가이드를 생성하십시오.

1단계: 입력값 확인 및 애매함 판단 (isInputAmbiguous)
- **중요**: isInputAmbiguous는 입력 정보가 지나치게 부족하여(예: 빈칸이거나 단어 1~2개만 존재하여) 어떤 정황인지 유추가 아예 불가능한 최악의 극단적 상황에서만 true로 설정해야 합니다.
- 사용자가 최소한의 단어(예: "기기 고장", "정산")나 대략적인 문장을 적었다면, 절대 추가 질문을 던지지 말고 **적극적으로 전문 영업관련 지식을 발휘하여 유추해내고 즉시 완성된 응대 초안들을 제공(isInputAmbiguous = false)**해야 합니다. 사용자를 번거롭게 질문으로 방해하지 않는 것이 최고의 사용자 경험입니다.
- isInputAmbiguous가 false인 경우, clarificationQuestions는 반드시 빈 배열 []이어야 합니다.

2단계: 숨겨진 니즈 및 심각도 분석
- 문제의 심각도(낮음, 보통, 높음, 매우 높음)와 점주가 실질적으로 가장 우려하는 지점(detectedNeeds)을 정성껏 파악합니다.
- '가맹점주 특이사항'(예: 스트레스 극심, 반복 민원 등)이 있다면 공감 표현의 강도를 최고조로 조절합니다.

3단계: 리스크 신호 감지 (안전장치)
- 아래 신호가 감지되면 riskWarnings 리스트에 추가하고, markdownOutput 상단에 적절한 경고 배지를 추가합니다.
  - 금액/수치가 포함된 경우 → "⚠️ 아래 금액·수치는 예시이며, 실제 발송 전 정확한 데이터로 반드시 교체하세요"
  - 위약금, 손해배상, 계약 위반, 법적 조치 언급 → "🚨 이 건은 법무팀/상급자 검토 후 발송을 권장합니다"
  - 언론/SNS 노출 우려, 본사 이미지 타격 언급 → "🚨 홍보팀 공유를 권장합니다"

4단계: 요청사항 수용 여부 판단
- 규정상 즉각 수용 가능한 부분은 명확히 안내하고, 어려운 부분은 정중한 거절 + 합리적 대안을 제시합니다.
- 본사 정책이나 금전적 보상안을 임의로 지어내지 않습니다. 확정되지 않은 사항은 "확인 후 [담당팀]과 협의하여 재안내드리겠습니다" 형태로 처리합니다.

5단계: 매체별 작성 규칙 및 분량 한계 (매우 중요)
- **최상의 생성 속도와 가독성을 위해 불필요하게 장황한 살붙이기는 배제하고, 핵심 공감 및 명확한 실무 조치(3~4문장 내외) 위주로 조밀하게 작성하십시오.**
- **전화 응대 스크립트**: 구어체, [도입 및 진심 어린 공감 → 상황·요청사항 검토 결과 → 해결책/대안 제시 → 정중한 마무리] 흐름으로 3~4문장 내외로 자연스럽고 임팩트 있게 구성합니다.
- **이메일 초안**: 격식 있는 문어체, [제목 → 공감 인사말 → 검토 결과 및 대안 조치 → 향후 이행 계획 → 끝맺음] 구조로 간략하고 깔끔하게 작성합니다.
- **문자/카톡 메시지**: 3문장 이내로 신속 전파가 가능하도록 모바일 최적화된 형태로 핵심만 압축해 작성합니다.
- 확인이 필요한 담당자명, 시간, 정확한 수치는 [ ] 괄호로 표시하여 사용자가 직접 채우게 합니다.

6단계: 마크다운 리포트 (markdownOutput) 작성 규칙
- 마크다운으로 출력하며, 상단에 **문의 유형 / 선택한 응대 형식과 이유**를 한 줄로 간결히 명시합니다.
- 리스크 경고 배지가 있다면 그 아래 줄에 표시하고, 각 매체별 초안을 Heading(### 전화 응대 스크립트 등)으로 구분하여 정중하고 깔끔하게 제시합니다.

제약 사항 및 속도 최적화:
- 중복 표현을 피하고, 3~4문장 내외로 신선하고 가독성이 뛰어난 초안을 만들어 내어 전체 생성 토큰 수를 줄임으로써 로딩 시간을 극단적으로 단축해야 합니다.
- 존댓말을 정교하게 사용하고 가맹점주를 파트너로서 존중하는 최상급 비즈니스 에티켓을 유지합니다.
`;

    const userPrompt = `
[Input]
- 문의/클레임 유형: ${category || "미지정"}
- 상황 요약: ${summary || "미정 (즉각 대처 요구)"}
- 점주/거래처 요청사항: ${request || "미정 (AI 추천안 수립)"}
- 가맹점주 특이사항: ${specialNotes || "없음"}
- 원하는 응대 형식: ${preferredFormat || "미지정 (AI 판단)"}
`;

    const response = await activeAi.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: systemInstruction },
        { text: userPrompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "isInputAmbiguous",
            "clarificationQuestions",
            "detectedNeeds",
            "severity",
            "riskWarnings",
            "responseFormatReasoning",
            "markdownOutput",
            "drafts"
          ],
          properties: {
            isInputAmbiguous: {
              type: Type.BOOLEAN,
              description: "정보가 절대적으로 부족하여(예: 텅 비어있거나 극단적 무의미) 대안 수립이 아예 불가하여 질문이 꼭 필요한지 여부"
            },
            clarificationQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "isInputAmbiguous가 true일 때만 입력에 대한 확인 질문 1~2개 기재. false일 때는 반드시 빈 배열 []"
            },
            detectedNeeds: {
              type: Type.STRING,
              description: "분석된 점주/거래처의 숨겨진 심리적/물리적 본질 니즈 (예: 매출 손실 보전 열망, 점포 지속 신뢰 등)"
            },
            severity: {
              type: Type.STRING,
              description: "심각도 단계 (낮음, 보통, 높음, 매우 높음)"
            },
            riskWarnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "위약금/법적/대외 언론 노출 등 감지된 실질 리스크 경고 문구 목록 (없으면 빈 배열 [])"
            },
            responseFormatReasoning: {
              type: Type.STRING,
              description: "선택한 응대 형식(전화, 이메일, 문자 등)과 그 핵심적 매칭 판단 근거"
            },
            markdownOutput: {
              type: Type.STRING,
              description: "전체 결과를 깔끔하게 정리한 마크다운 리포트 텍스트 (경고 배지 포함)"
            },
            drafts: {
              type: Type.ARRAY,
              description: "플레이스홀더 [ ]가 탑재된 개별 완성형 응대 초안 목록",
              items: {
                type: Type.OBJECT,
                required: ["type", "title", "content"],
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "초안 형식 (반드시 '전화 스크립트', '이메일', '문자/카톡' 중 하나)"
                  },
                  title: {
                    type: Type.STRING,
                    description: "이메일 형식일 때의 정교한 이메일 제목 초안 (그 외 형식일 때는 빈 문자열 \"\")"
                  },
                  content: {
                    type: Type.STRING,
                    description: "3~4문장 수준으로 간결하고 임팩트 있는 고품격 초안 본문 (확정되지 않은 값은 반드시 [담당자명], [보상방안] 처럼 [ ]로 남겨둘 것)"
                  }
                }
              }
            }
          }
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText);
    res.json(resultJson);
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: "응답 생성 도중 서버 에러가 발생했습니다.", details: error.message });
  }
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
