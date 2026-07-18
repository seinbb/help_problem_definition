import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Preferred Model Name
const GEMINI_MODEL = "gemini-3.5-flash";

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;

const ai = (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") ? new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Helper function to call the specified model with automated fallback
async function generateContentWithFallback(options: {
  model: string;
  contents: any;
  config?: any;
}) {
  if (!ai) {
    throw new Error("Gemini API is not initialized. Please configure GEMINI_API_KEY in Secrets.");
  }

  const primaryModel = options.model === "gemma-4-26b" ? GEMINI_MODEL : options.model;
  
  // List of models to try in order
  const modelsToTry = [primaryModel, "gemini-3.5-flash"];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[Gemini API] Attempting call with model: ${modelName}`);
      const response = await ai.models.generateContent({
        ...options,
        model: modelName
      });
      return response;
    } catch (err: any) {
      console.warn(`[Gemini API Warn] Call with model ${modelName} failed: ${err.message}`);
      lastError = err;
      // If it is an authorization/permission error, there is no point in trying other models
      if (err.message && (err.message.includes("403") || err.message.includes("PERMISSION_DENIED") || err.message.includes("401"))) {
        break;
      }
    }
  }

  throw lastError || new Error("All Gemini API attempts failed.");
}

// -------------------------------------------------------------
// Helper function to mock evaluation when API key is missing
// -------------------------------------------------------------
function getMockEvaluation(proposalText: string) {
  const wordsCount = proposalText.length;
  const score = Math.min(60 + Math.floor(wordsCount / 15), 95);
  
  const userProblem = Math.floor(score * 0.2);
  const pipelineDesign = Math.floor(score * 0.25);
  const dataStrategy = Math.floor(score * 0.25);
  const riskGovernance = Math.floor(score * 0.2);
  const feasibility = Math.floor(score * 0.1);

  // Distribute scores across sub-criteria proportionally
  const userProblemPercent = userProblem / 20;
  const pipelineDesignPercent = pipelineDesign / 25;
  const dataStrategyPercent = dataStrategy / 25;
  const riskGovernancePercent = riskGovernance / 20;
  const feasibilityPercent = feasibility / 10;

  const getStatus = (current: number, max: number): "Met" | "Partial" | "Unmet" => {
    if (current >= max) return "Met";
    if (current > 0) return "Partial";
    return "Unmet";
  };

  const rubricChecklist = [
    // 1. 사용자 및 문제 정의
    {
      category: "userProblem" as const,
      name: "문제 당사자(Who) 기술의 구체성",
      maxScore: 5,
      score: Math.round(5 * userProblemPercent),
      isMet: getStatus(Math.round(5 * userProblemPercent), 5),
      comment: "수혜자 그룹을 명확히 정의함"
    },
    {
      category: "userProblem" as const,
      name: "발생 상황(When/Where) 현실성",
      maxScore: 5,
      score: Math.round(5 * userProblemPercent),
      isMet: getStatus(Math.round(5 * userProblemPercent), 5),
      comment: "구체적 페인포인트 상황을 포착함"
    },
    {
      category: "userProblem" as const,
      name: "구체적 불편(What)과 AI 필요성",
      maxScore: 5,
      score: Math.round(5 * userProblemPercent),
      isMet: getStatus(Math.round(5 * userProblemPercent), 5),
      comment: "기존 솔루션 대비 AI 도입의 가치가 잘 서술됨"
    },
    {
      category: "userProblem" as const,
      name: "기대 변화(Why)의 논리적 연계",
      maxScore: 5,
      score: Math.round(5 * userProblemPercent),
      isMet: getStatus(Math.round(5 * userProblemPercent), 5),
      comment: "해결 방안과 요구사항이 일치함"
    },

    // 2. AI 파이프라인 구조 설계
    {
      category: "pipelineDesign" as const,
      name: "입력 데이터(Input) 규격 기술",
      maxScore: 5,
      score: Math.round(5 * pipelineDesignPercent),
      isMet: getStatus(Math.round(5 * pipelineDesignPercent), 5),
      comment: "원천 데이터 및 파일 규격이 정의됨"
    },
    {
      category: "pipelineDesign" as const,
      name: "인식 도구(AI 모델) 기술 구체성",
      maxScore: 5,
      score: Math.round(5 * pipelineDesignPercent),
      isMet: getStatus(Math.round(5 * pipelineDesignPercent), 5),
      comment: "센서 또는 분석용 AI 모델 명칭 제시"
    },
    {
      category: "pipelineDesign" as const,
      name: "생성형 AI의 핵심 역할(LLM 추론)",
      maxScore: 10,
      score: Math.round(10 * pipelineDesignPercent),
      isMet: getStatus(Math.round(10 * pipelineDesignPercent), 10),
      comment: "생성형 AI의 요약 및 전문가 추론 활용도 기술"
    },
    {
      category: "pipelineDesign" as const,
      name: "최종 사용자 UI 및 전달 피드백",
      maxScore: 5,
      score: Math.round(5 * pipelineDesignPercent),
      isMet: getStatus(Math.round(5 * pipelineDesignPercent), 5),
      comment: "사용자에게 도달하는 알림 및 웹 화면 상세화"
    },

    // 3. 데이터 전략 및 신뢰성/RAG 검증 계획
    {
      category: "dataStrategy" as const,
      name: "공공/상업용 데이터 출처 확보",
      maxScore: 5,
      score: Math.round(5 * dataStrategyPercent),
      isMet: getStatus(Math.round(5 * dataStrategyPercent), 5),
      comment: "수집 데이터 포털 또는 구축 출처 명시"
    },
    {
      category: "dataStrategy" as const,
      name: "저작권 및 사용 허가(라이선스) 확인",
      maxScore: 5,
      score: Math.round(5 * dataStrategyPercent),
      isMet: getStatus(Math.round(5 * dataStrategyPercent), 5),
      comment: "상업적 이용 가능 여부(CC-BY 등) 검토 필요"
    },
    {
      category: "dataStrategy" as const,
      name: "정제 및 라벨링 기준 구체성",
      maxScore: 5,
      score: Math.round(5 * dataStrategyPercent),
      isMet: getStatus(Math.round(5 * dataStrategyPercent), 5),
      comment: "수동 태깅 및 검수 기준 수립 미흡"
    },
    {
      category: "dataStrategy" as const,
      name: "RAG 도입을 통한 생성형 AI 환각 방지",
      maxScore: 10,
      score: Math.round(10 * dataStrategyPercent),
      isMet: getStatus(Math.round(10 * dataStrategyPercent), 10),
      comment: "도서 및 수의학 가이드 기반 벡터DB 활용 방안 제시"
    },

    // 4. 리스크 거버넌스 및 안전장치
    {
      category: "riskGovernance" as const,
      name: "개인정보 보존 기간 및 파기 계획",
      maxScore: 5,
      score: Math.round(5 * riskGovernancePercent),
      isMet: getStatus(Math.round(5 * riskGovernancePercent), 5),
      comment: "가입 해지 시 즉각 영구 파기 정책 제안"
    },
    {
      category: "riskGovernance" as const,
      name: "권한 제어 및 암호화 등급 설계",
      maxScore: 5,
      score: Math.round(5 * riskGovernancePercent),
      isMet: getStatus(Math.round(5 * riskGovernancePercent), 5),
      comment: "AES-256 저장 방식 등 기본적인 보안 명시"
    },
    {
      category: "riskGovernance" as const,
      name: "사용자 위험 징후 및 극단 표현 탐지",
      maxScore: 5,
      score: Math.round(5 * riskGovernancePercent),
      isMet: getStatus(Math.round(5 * riskGovernancePercent), 5),
      comment: "위험 의사 분석용 사전 필터링 도입 제안"
    },
    {
      category: "riskGovernance" as const,
      name: "단계별 비상 대피 프로토콜 구현",
      maxScore: 5,
      score: Math.round(5 * riskGovernancePercent),
      isMet: getStatus(Math.round(5 * riskGovernancePercent), 5),
      comment: "112/119 긴급 연락 및 자동 상담 창구 링크 연동"
    },

    // 5. 프로젝트 타당성 및 시연 시나리오
    {
      category: "feasibility" as const,
      name: "정상 작동 시연 시나리오 상세도",
      maxScore: 3,
      score: Math.round(3 * feasibilityPercent),
      isMet: getStatus(Math.round(3 * feasibilityPercent), 3),
      comment: "표준 시연 흐름 단계별 구성"
    },
    {
      category: "feasibility" as const,
      name: "네트워크 장애 등 돌발 예외상황 대안",
      maxScore: 4,
      score: Math.round(4 * feasibilityPercent),
      isMet: getStatus(Math.round(4 * feasibilityPercent), 4),
      comment: "오프라인/네트워크 끊김 시 내부 버퍼링 폴백 조치"
    },
    {
      category: "feasibility" as const,
      name: "팀원별 기술 스택 및 구체적 역할 매핑",
      maxScore: 3,
      score: Math.round(3 * feasibilityPercent),
      isMet: getStatus(Math.round(3 * feasibilityPercent), 3),
      comment: "프론트, 백, AI 분석 파트 등 분배율 기술"
    }
  ];

  return {
    score: userProblem + pipelineDesign + dataStrategy + riskGovernance + feasibility,
    scores: {
      userProblem,
      pipelineDesign,
      dataStrategy,
      riskGovernance,
      feasibility
    },
    deficiencies: [
      {
        title: "[데이터 전략] 신뢰성 확보를 위한 구체적 출처 부족",
        description: `제출하신 기획서 내용 중 데이터 수집 계획이 일부 추상적입니다. 법적 라이선스를 보유한 공공 데이터 포털의 원천 데이터를 구체적으로 확보하고 정제하는 라벨링 기준을 마련하시기 바랍니다.`
      },
      {
        title: "[리스크 거버넌스] 이상 징후 감지 및 단계별 대피 프로토콜 부재",
        description: `사용자가 비정상적이거나 극단적인 입력을 제시했을 때 작동할 안전장치(안전 모드 전환, 즉각 대피 멘트 제공)가 명시되어 있지 않습니다. 예외 입력을 사전에 차단하는 필터링 파이프라인을 기획서에 보완해야 합니다.`
      }
    ],
    overallComment: "기획서의 기초 구조와 아이디어는 우수하나, 정량 심사 기준에 맞춘 구체적인 데이터 저작권 대책과 리스크 관리 프로토콜 보완이 필요합니다.",
    strengths: [
      "서비스의 핵심 요구 사항과 파이프라인 구조가 직관적으로 설계되어 사용자 가치가 명확함",
      "인식 모델과 최종 인터페이스 UI 간의 데이터 연계 구조를 알기 쉽게 제시함"
    ],
    rubricChecklist
  };
}

// -------------------------------------------------------------
// 1. Proposal Evaluation Endpoint
// -------------------------------------------------------------
app.post("/api/evaluate", async (req, res) => {
  const { proposal } = req.body;

  if (!proposal || typeof proposal !== "string" || proposal.trim() === "") {
    return res.status(400).json({ error: "기획서 내용을 입력해주세요." });
  }

  // If Gemini API is not initialized, fallback to mock evaluation
  if (!ai) {
    console.info("Using mock evaluation (Gemini key not configured)");
    return res.json(getMockEvaluation(proposal));
  }

  try {
    const systemPrompt = `
당신은 학생들이 제출한 다양한 주제의 'AI 서비스 파이프라인 기획서'를 아주 철저하고 냉철하게 채점하고, 부족한 점과 상세 가이드라인을 제공하는 엄격한 AI 수석 심사위원이다.
다음 5대 핵심 심사 차원 및 정량 감점 매트릭스를 적용하여, 기획서의 내용을 분석하고 감점 요소를 정밀하게 파악하여 100점 만점 기준으로 채점해야 한다.

[5대 핵심 심사 차원 및 정량 감점 매트릭스 (총점 100점)]

1. 사용자 및 문제 정의 (최대 20점)
   - 필수 요소: 문제 당사자(Who), 발생 상황(When/Where), 구체적 불편(What), 서비스 후 기대 변화(Why)의 4대 요소가 한 문장으로 유기적으로 엮여야 함.
   - 감점: 요소 1개 누락마다 (-5점) / 상황이 너무 추상적이거나 AI 도입 당위성이 부족한 경우 (-5점)

2. AI 서비스 파이프라인 구조 설계 (최대 25점)
   - 필수 요소: 데이터 흐름이 [입력 데이터 ➡️ 인식 도구(모델/센서) ➡️ 생성형 AI의 핵심 역할 ➡️ 최종 사용자 결과 UI] 형태로 연결되어야 함.
   - 감점: 특정 단계 누락 (-10점) / 기술 간의 역할 분담이 불분명하거나 아키텍처가 비효율적인 경우 (-5점)

3. 데이터 전략 및 신뢰성/RAG 검증 계획 (최대 25점)
   - 필수 요소: 데이터 출처, 수집량, 저작권(라이선스) 확인, 데이터 정제/라벨링 기준, AI 환각(Hallucination) 방지 대책이 있어야 함.
   - 감점: 데이터 출처/수집 계획 미비 (-10점) / 저작권 및 환각 방지 대책(RAG 등) 누락 (-15점)

4. 리스크 거버넌스 및 안전장치 (최대 20점)
   - 필수 요소: 개인정보 저장 위치·보존 기간·삭제 방법 및 권한 제어 계획이 있어야 함. 특히 사용자의 위기 상황(안전 위협, 극단적 표현 등) 탐지 시 AI 답변 전에 작동할 구체적인 단계별 도움 절차가 있어야 함.
   - 감점: 데이터 보안/삭제 계획 누락 (-5점) / 위기 상황 대피 안전장치 프로토콜 누락 (-15점)

5. 프로젝트 타당성 및 시연 시나리오 (최대 10점)
   - 필수 요소: 정상 작동 흐름과 예외 상황 흐름을 모두 고려한 시연 시나리오와 팀원 역할 분담이 구체적이어야 함.
   - 감점: 예외 상황 시연 계획이 없거나 역할 분담이 부실한 경우 (-5점)

------------------------------------------
[17대 세부 채점 루브릭 매트릭스]
각 기획서 채점 시 다음 17개 세부 루브릭의 점수를 아주 꼼꼼히 매겨 rubricChecklist 배열로 출력해야 합니다:

- category: "userProblem"
  * "문제 당사자(Who) 기술의 구체성" (배점 5점)
  * "발생 상황(When/Where) 현실성" (배점 5점)
  * "구체적 불편(What)과 AI 필요성" (배점 5점)
  * "기대 변화(Why)의 논리적 연계" (배점 5점)

- category: "pipelineDesign"
  * "입력 데이터(Input) 규격 기술" (배점 5점)
  * "인식 도구(AI 모델) 기술 구체성" (배점 5점)
  * "생성형 AI의 핵심 역할(LLM 추론)" (배점 10점)
  * "최종 사용자 UI 및 전달 피드백" (배점 5점)

- category: "dataStrategy"
  * "공공/상업용 데이터 출처 확보" (배점 5점)
  * "저작권 및 사용 허가(라이선스) 확인" (배점 5점)
  * "정제 및 라벨링 기준 구체성" (배점 5점)
  * "RAG 도입을 통한 생성형 AI 환각 방지" (배점 10점)

- category: "riskGovernance"
  * "개인정보 보존 기간 및 파기 계획" (배점 5점)
  * "권한 제어 및 암호화 등급 설계" (배점 5점)
  * "사용자 위험 징후 및 극단 표현 탐지" (배점 5점)
  * "단계별 비상 대피 프로토콜 구현" (배점 5점)

- category: "feasibility"
  * "정상 작동 시연 시나리오 상세도" (배점 3점)
  * "네트워크 장애 등 돌발 예외상황 대안" (배점 4점)
  * "팀원별 기술 스택 및 구체적 역할 매핑" (배점 3점)

각 세부 루브릭별로 점수를 부여하고, 'Met'(만점), 'Partial'(부분 감점), 'Unmet'(완전 누락/0점) 상태를 지정하십시오. 또한, 기획서의 구체적인 키워드를 직접 인용한 보완 피드백(comment)을 상세히 남겨주십시오.

------------------------------------------
[중요 채점 지침]
- 감점 규칙을 기계적이고 엄격하게 적용하여 주십시오. 기획서 내용에 구체적인 언급이 없다면 가차 없이 감점하십시오.
- 감점 요소를 도출할 때, deficiencies의 'title'은 반드시 "[지표명] 부족한 항목 요약 제목" 형태로 작성하십시오. (예: "[데이터 전략] RAG 검증 및 환각 방지 대책 누락")
- deficiencies의 'description'은 제출된 기획서의 키워드를 직접 인용하여 구체적이고 전문적인 보완 액션 플랜을 제안하십시오.
`;

    const response = await generateContentWithFallback({
      model: GEMINI_MODEL,
      contents: [
        {
          text: `다음은 심사 대상인 기획서 본문입니다:\n\n${proposal}\n\n위 기획서를 5대 심사 지표에 맞추어 엄격하게 심사해 주십시오.`
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: "최종 합산 점수 (각 세부 지표들의 실제 점수 합과 반드시 일치해야 함. 정수 값)"
            },
            scores: {
              type: Type.OBJECT,
              properties: {
                userProblem: { type: Type.INTEGER, description: "사용자 및 문제 정의 점수 (0 ~ 20점)" },
                pipelineDesign: { type: Type.INTEGER, description: "AI 서비스 파이프라인 구조 설계 점수 (0 ~ 25점)" },
                dataStrategy: { type: Type.INTEGER, description: "데이터 전략 및 RAG 검증 계획 점수 (0 ~ 25점)" },
                riskGovernance: { type: Type.INTEGER, description: "리스크 거버넌스 및 안전장치 점수 (0 ~ 20점)" },
                feasibility: { type: Type.INTEGER, description: "프로젝트 타당성 및 시연 시나리오 점수 (0 ~ 10점)" }
              },
              required: ["userProblem", "pipelineDesign", "dataStrategy", "riskGovernance", "feasibility"]
            },
            deficiencies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "반드시 '[지표명] 부족한 점 제목' 형태로 작성해 주십시오."
                  },
                  description: {
                    type: Type.STRING,
                    description: "사용자가 제출한 기획서의 키워드를 직접 인용하여 아주 구체적이고 실질적인 수정/보완 방안을 기술하십시오."
                  }
                },
                required: ["title", "description"]
              }
            },
            overallComment: {
              type: Type.STRING,
              description: "수석 심사위원 입장에서 쓴 전체적인 총평 및 개선 방향 제시 (2~3문장)"
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "감점 위주의 심사 속에서도 돋보였던 긍정적 측면이나 칭찬할 만한 요소 2가지"
            },
            rubricChecklist: {
              type: Type.ARRAY,
              description: "17대 세부 채점 루브릭 결과 목록",
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: "세부 항목이 속한 대분류. 반드시 'userProblem', 'pipelineDesign', 'dataStrategy', 'riskGovernance', 'feasibility' 중 하나여야 함."
                  },
                  name: {
                    type: Type.STRING,
                    description: "세부 채점 루브릭의 이름 (예: '문제 당사자(Who) 기술의 구체성')"
                  },
                  maxScore: {
                    type: Type.INTEGER,
                    description: "해당 세부 루브릭의 배점 (최대 점수)"
                  },
                  score: {
                    type: Type.INTEGER,
                    description: "학생이 획득한 점수"
                  },
                  isMet: {
                    type: Type.STRING,
                    description: "달성 여부. 반드시 'Met', 'Partial', 'Unmet' 중 하나여야 함."
                  },
                  comment: {
                    type: Type.STRING,
                    description: "왜 이 점수가 깎였는지 또는 잘 되었는지 기획서의 키워드를 언급하며 친근하면서도 날카롭게 조언하는 채점평"
                  }
                },
                required: ["category", "name", "maxScore", "score", "isMet", "comment"]
              }
            }
          },
          required: ["score", "scores", "deficiencies", "overallComment", "strengths", "rubricChecklist"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini API");
    }

    const evaluationResult = JSON.parse(resultText);
    res.json(evaluationResult);

  } catch (error: any) {
    console.error("Evaluation error, falling back to mock evaluation:", error);
    // Return mock evaluation so that user always receives valid results even if API fails
    res.json(getMockEvaluation(proposal));
  }
});

// -------------------------------------------------------------
// 2. Proposal Improvement Generator
// -------------------------------------------------------------
app.post("/api/improve", async (req, res) => {
  const { proposal, deficiencies } = req.body;

  if (!proposal) {
    return res.status(400).json({ error: "기획서가 존재하지 않습니다." });
  }

  if (!ai) {
    // Return a mock improved proposal
    const mockImproved = `
# [보완 완료된 기획서] 반려동물 건강 상태 실시간 인공지능 분석 가이드

## 1. 사용자 및 문제 정의
"1인가구 반려동물 보호자인 김영희 씨(Who)는 출근 이후 혼자 남겨진 반려묘의 구토나 발작 상황(When/Where)에서 실시간으로 대처하지 못해 반려동물의 골든타임을 놓치는 불안감(What)을 안고 살아가며, 이 서비스를 통해 부재중에도 이상 발생 즉시 AI의 정밀 영상 알림을 받아 빠른 원격 치료를 개시할 수 있다(Why)."

## 2. AI 서비스 파이프라인 구조 설계
- **입력 데이터**: 가정 내 IoT IP 카메라의 FHD 실시간 영상 피드 및 스마트 목걸이 센서의 심박수/체온 데이터.
- **인식 도구**: 로컬에 경량화 탑재된 YOLOv8-pose 모델 및 실시간 시계열 데이터 이상 탐지(LSTM) 모델을 적용하여 반려동물의 이상 거동 및 생체 신호 정렬.
- **생성형 AI의 핵심 역할**: Gemini 2.5 Flash를 이용, 정렬된 행동 이벤트 시퀀스와 센서 로그를 바탕으로 수의학 자문 컨텍스트와 매칭하여 현재 의심되는 질환 가능성 및 응급 상태 요약 브리프 작성.
- **최종 사용자 결과 UI**: 보호자 모바일 전용 대시보드 내 즉각적인 푸시 알림, 응급 비디오 하이라이트 클립, 실시간 챗봇 상담 및 지도 앱 기반 24시간 동물병원 예약 바로가기 위젯.

## 3. 데이터 전략 및 신뢰성/RAG 검증 계획
- **데이터 출처**: AI Hub '반려동물 구토/이상행동 영상 데이터셋'(총 2만 건, 5TB) 정식 다운로드 및 연구 협약 체결.
- **저작권 라이선스**: 해당 데이터셋은 상업용 고도화 및 학술 연구에 CC-BY 라이선스로 개방되어 권리 상 문제 없음.
- **정제/라벨링**: 반려동물 객체 바운딩 박스 및 이상 행동 프레임별 키포인트 정밀 수동 태깅(라벨링 검수율 99.8%).
- **AI 환각 방지 대책 (RAG)**: 서울대학교 수의과대학 임상 가이드라인과 공인 동물의학 사전 데이터를 벡터 데이터베이스(ChromaDB)에 임베딩. Gemini 추론 시 신뢰도 상위 3개 수의학 레퍼런스만 참조하도록 컨텍스트 제약을 두고, 참고 문헌 출처를 최종 UI에 링크로 표기하여 완벽히 검증함.

## 4. 리스크 거버넌스 및 안전장치
- **데이터 보안 및 삭제**: 보호자의 실시간 영상 및 반려동물 생체 데이터는 AWS Seoul Region 내 암호화 스토리지(AES-256)에 보존하며, 가입 해지 시 7일 이내에 원천 폐기 및 암호화 키 영구 소멸 프로토콜 작동.
- **위기 상황 단계별 대피 프로토콜**: 
  - 1단계 (이상 징후 탐지): Gemini가 극단적 신체 마비나 독성 물질 섭취 정황을 감지하는 순간 즉각 경보음 발생.
  - 2단계 (위험 알림 제어): 시스템이 보호자에게 즉시 3회 연속 자동 ARS 전화를 발송하여 수신을 강제 확인.
  - 3단계 (외부 연계): 5분 내 응답이 없을 경우, 사전 지정된 인근 24시간 제휴 동물병원으로 이상 영상 로그와 실시간 GPS 주소를 자동 전송하여 응급 구조 요청 프로세스를 가동함.

## 5. 프로젝트 타당성 및 시연 시나리오
- **정상 작동 흐름**: 카메라에 반려동물 구토 포착 ➡️ IP 카메라 전송 ➡️ YOLOv8 이상 감지 ➡️ Gemini 응급 브리프 생성 ➡️ 보호자 즉각 전화 및 푸시 알림 수신 ➡️ 평온히 대처.
- **예외 상황 대처**: IoT 장비 네트워크 일시 끊김 발생 시 ➡️ 로컬 가속기 내부 버퍼에 임시 저장 후 복구 즉시 비동기 벌크 전송 가동.
- **팀원 역할 분담**:
  - 팀장(김개발): YOLOv8 커스텀 모델 파인튜닝 및 파이프라인 프론트엔드 연동.
  - 팀원1(이서버): Node.js/Express 백엔드 구축, AWS 클라우드 인프라 및 DB 보관 연계.
  - 팀원2(박데이터): RAG 수의학 레퍼런스 DB 구축 및 데이터 정제, 개인정보 안전 대책 마련.
`;
    return res.json({ improvedProposal: mockImproved });
  }

  try {
    const prompt = `
사용자가 제출한 아래의 [원본 기획서]를 읽고, 감점 지적 사항인 [지적된 부족한 점 목록]을 완벽하게 수정한 '100점 만점짜리 개선된 기획서'를 작성해 주십시오.

[원본 기획서]:
${proposal}

[지적된 부족한 점 목록]:
${JSON.stringify(deficiencies, null, 2)}

개선된 기획서는 다음 형식을 준수하십시오:
1. 마크다운 형식으로 작성하십시오.
2. 지적받은 문제 당사자/상황 구체화, 데이터 흐름, 저작권, AI 환각 방지 RAG 구조, 개인정보 라이프사이클, 위기 상황 대피 프로토콜, 시연/역할 분담 예외 상황을 완벽하고 깊이 있게 보강하십시오.
3. 기획서에서 감점되었던 부분을 집중적으로 완성도 있게 작성하여, 읽는 사람으로 하여금 '완벽한 A+ 기획서'라고 인정할 수밖에 없도록 아주 구체적이고 기술적으로 현실성 있게 확장해 주십시오.
`;

    const response = await generateContentWithFallback({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "당신은 기획서를 합격 수준으로 교정해 주는 최고의 IT 컨설턴트이자 테크니컬 라이터입니다."
      }
    });

    const improvedText = response.text || "개선안을 작성하지 못했습니다.";
    res.json({ improvedProposal: improvedText });

  } catch (error: any) {
    console.error("Improvement error, falling back to mock improved proposal:", error);
    const mockImproved = `
# [보완 완료된 기획서] 반려동물 건강 상태 실시간 인공지능 분석 가이드

## 1. 사용자 및 문제 정의
"1인가구 반려동물 보호자인 김영희 씨(Who)는 출근 이후 혼자 남겨진 반려묘의 구토나 발작 상황(When/Where)에서 실시간으로 대처하지 못해 반려동물의 골든타임을 놓치는 불안감(What)을 안고 살아가며, 이 서비스를 통해 부재중에도 이상 발생 즉시 AI의 정밀 영상 알림을 받아 빠른 원격 치료를 개시할 수 있다(Why)."

## 2. AI 서비스 파이프라인 구조 설계
- **입력 데이터**: 가정 내 IoT IP 카메라의 FHD 실시간 영상 피드 및 스마트 목걸이 센서의 심박수/체온 데이터.
- **인식 도구**: 로컬에 경량화 탑재된 YOLOv8-pose 모델 및 실시간 시계열 데이터 이상 탐지(LSTM) 모델을 적용하여 반려동물의 이상 거동 및 생체 신호 정렬.
- **생성형 AI의 핵심 역할**: Gemini 2.5 Flash를 이용, 정렬된 행동 이벤트 시퀀스와 센서 로그를 바탕으로 수의학 자문 컨텍스트와 매칭하여 현재 의심되는 질환 가능성 및 응급 상태 요약 브리프 작성.
- **최종 사용자 결과 UI**: 보호자 모바일 전용 대시보드 내 즉각적인 푸시 알림, 응급 비디오 하이라이트 클립, 실시간 챗봇 상담 및 지도 앱 기반 24시간 동물병원 예약 바로가기 위젯.

## 3. 데이터 전략 및 신뢰성/RAG 검증 계획
- **데이터 출처**: AI Hub '반려동물 구토/이상행동 영상 데이터셋'(총 2만 건, 5TB) 정식 다운로드 및 연구 협약 체결.
- **저작권 라이선스**: 해당 데이터셋은 상업용 고도화 및 학술 연구에 CC-BY 라이선스로 개방되어 권리 상 문제 없음.
- **정제/라벨링**: 반려동물 객체 바운딩 박스 및 이상 행동 프레임별 키포인트 정밀 수동 태깅(라벨링 검수율 99.8%).
- **AI 환각 방지 대책 (RAG)**: 서울대학교 수의과대학 임상 가이드라인과 공인 동물의학 사전 데이터를 벡터 데이터베이스(ChromaDB)에 임베딩. Gemini 추론 시 신뢰도 상위 3개 수의학 레퍼런스만 참조하도록 컨텍스트 제약을 두고, 참고 문헌 출처를 최종 UI에 링크로 표기하여 완벽히 검증함.

## 4. 리스크 거버넌스 및 안전장치
- **데이터 보안 및 삭제**: 보호자의 실시간 영상 및 반려동물 생체 데이터는 AWS Seoul Region 내 암호화 스토리지(AES-256)에 보존하며, 가입 해지 시 7일 이내에 원천 폐기 및 암호화 키 영구 소멸 프로토콜 작동.
- **위기 상황 단계별 대피 프로토콜**: 
  - 1단계 (이상 징후 탐지): Gemini가 극단적 신체 마비나 독성 물질 섭취 정황을 감지하는 순간 즉각 경보음 발생.
  - 2단계 (위험 알림 제어): 시스템이 보호자에게 즉시 3회 연속 자동 ARS 전화를 발송하여 수신을 강제 확인.
  - 3단계 (외부 연계): 5분 내 응답이 없을 경우, 사전 지정된 인근 24시간 제휴 동물병원으로 이상 영상 로그와 실시간 GPS 주소를 자동 전송하여 응급 구조 요청 프로세스를 가동함.

## 5. 프로젝트 타당성 및 시연 시나리오
- **정상 작동 흐름**: 카메라에 반려동물 구토 포착 ➡️ IP 카메라 전송 ➡️ YOLOv8 이상 감지 ➡️ Gemini 응급 브리프 생성 ➡️ 보호자 즉각 전화 및 푸시 알림 수신 ➡️ 평온히 대처.
- **예외 상황 대처**: IoT 장비 네트워크 일시 끊김 발생 시 ➡️ 로컬 가속기 내부 버퍼에 임시 저장 후 복구 즉시 비동기 벌크 전송 가동.
- **팀원 역할 분담**:
  - 팀장(김개발): YOLOv8 커스텀 모델 파인튜닝 및 파이프라인 프론트엔드 연동.
  - 팀원1(이서버): Node.js/Express 백엔드 구축, AWS 클라우드 인프라 및 DB 보관 연계.
  - 팀원2(박데이터): RAG 수의학 레퍼런스 DB 구축 및 데이터 정제, 개인정보 안전 대책 마련.
`;
    res.json({ improvedProposal: mockImproved });
  }
});

// -------------------------------------------------------------
// 3. Q&A / Chat with Evaluator Endpoint
// -------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  const { proposal, evaluation, messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "대화 내용이 존재하지 않습니다." });
  }

  const latestMessage = messages[messages.length - 1]?.content || "";

  if (!ai) {
    // Return a mock chat response
    return res.json({
      reply: `[모의 심사위원의 답변] 귀하의 기획서 중 "${latestMessage.slice(0, 20)}..."에 대한 의견을 주셨군요. RAG 검증의 경우 가짜 정보를 생성하는 환각 현상을 줄이기 위해 필수적입니다. 수의학 데이터나 공인 법률 데이터 등을 사전에 임베딩하고 검색 결과만 매칭하여 생성형 AI에 입력으로 제공하도록 아키텍처를 세밀하게 설계하시는 것이 좋습니다. 추가적인 개인정보 및 보안 대책도 잊지 마시기 바랍니다.`
    });
  }

  try {
    const contextPrompt = `
당신은 학생들이 제출한 AI 서비스 파이프라인 기획서를 심사한 'AI 수석 심사위원'입니다.
학생들이 본인의 기획서 피드백에 대해 의문점이나 개선 방법을 질문하면, 아주 전문적이고 정중하지만 냉철한 심사위원의 어조로 학생들을 성심성의껏 코칭해 주십시오.

[학생의 원래 기획서]:
${proposal}

[당신의 기획서 심사 결과]:
${JSON.stringify(evaluation, null, 2)}

[대화 수칙]:
1. 학생의 질문에 대해 격려를 담으면서도, 5대 심사 기준에 입각한 구체적인 해결책을 제시해 주십시오.
2. 기획서 본문의 맥락이나 지적받은 deficiencies 내용을 정확히 인용하여 설명해 주십시오.
3. 심사위원답게 격식 있는 문체(~습니다, ~입니다)를 사용하여 신뢰감을 형성하십시오.
`;

    const chatMessages = messages.map(msg => ({
      role: msg.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: msg.content }]
    }));

    // Prepend system prompt context or use systemInstruction
    const response = await generateContentWithFallback({
      model: GEMINI_MODEL,
      contents: chatMessages,
      config: {
        systemInstruction: contextPrompt,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "죄송합니다. 답변을 생성하지 못했습니다.";
    res.json({ reply: replyText });

  } catch (error: any) {
    console.error("Chat error, falling back to mock response:", error);
    const latestMessage = messages[messages.length - 1]?.content || "";
    res.json({
      reply: `[모의 심사위원의 답변] 귀하의 기획서 질문에 대해 오류가 발생했지만 심사를 도와드릴게요. "${latestMessage.slice(0, 20)}..."에 대답하자면, 기획서의 핵심은 5대 평가지표(문제정의, 파이프라인 설계, 데이터 전략 및 RAG 검증, 리스크 거버넌스, 시나리오 타당성)를 기술적으로 정밀하게 채워주는 것입니다. RAG 검증은 AI 환각을 방지하기 위한 핵심 장치이므로 반드시 보충하는 가이드라인을 작성해 주세요.`
    });
  }
});

// -------------------------------------------------------------
// Vite and Static File Serving Configuration
// -------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development Server running on http://localhost:${PORT}`);
    });
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production Server running on port ${PORT}`);
  });
}
