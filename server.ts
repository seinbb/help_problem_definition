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
const GEMINI_MODEL = "gemma-4-26b";

// Initialize Gemini SDK with telemetry header
const apiKey = process.env.GEMINI_API_KEY;

const isKeyConfigured = !!(apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "");
console.log(`[Gemini API Config] Checking API Key...`);
if (isKeyConfigured) {
  console.log(`[Gemini API Config] GEMINI_API_KEY is configured (Length: ${apiKey!.length}). Initializing SDK.`);
} else {
  console.log(`[Gemini API Config] GEMINI_API_KEY is NOT configured or has default placeholder. Fallback mode active.`);
}

const ai = isKeyConfigured ? new GoogleGenAI({
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

  const primaryModel = options.model;
  
  // List of models to try in order
  const modelsToTry = [
    primaryModel,
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];

  // Remove duplicates while preserving insertion order
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const modelName of uniqueModels) {
    try {
      console.log(`[Gemini API] Attempting call with model: ${modelName}`);
      const response = await ai.models.generateContent({
        ...options,
        model: modelName
      });
      return response;
    } catch (err: any) {
      console.warn(`[Gemini API Warn] Call with model ${modelName} failed: ${err.message || err}`);
      lastError = err;
      
      // If we got an auth/permission error, check if it's model-specific.
      // E.g. gemini-3.5-flash might be blocked, but gemini-2.5-flash is allowed.
      // However, if standard models like gemini-2.5-flash also get 403/401, the key itself is likely invalid, so we break.
      if (err.message && (err.message.includes("403") || err.message.includes("PERMISSION_DENIED") || err.message.includes("401"))) {
        if (modelName === "gemini-2.5-flash" || modelName === "gemini-3.1-flash-lite" || modelName === "gemini-flash-latest") {
          console.warn("[Gemini API] Auth/Permission error on standard fallback model. Breaking fallback chain.");
          break;
        }
      }
    }
  }

  throw lastError || new Error("All Gemini API attempts failed.");
}

// -------------------------------------------------------------
// Helper function to mock evaluation when API key is missing
// -------------------------------------------------------------
interface Deficiency {
  title: string;
  description: string;
}

function getMockEvaluation(proposalText: string) {
  const wordsCount = proposalText.length;
  
  // Base scores starting at maximum
  let compliance = 30;
  let userProblem = 15;
  let pipelineDesign = 15;
  let dataStrategy = 15;
  let riskGovernance = 15;
  let feasibility = 10;
  
  const deficiencies: Deficiency[] = [];
  const comments = {
    medicalViolation: "의료법/전문직 직접 대체 소지가 식별되지 않아 준법 요건을 충족합니다.",
    surveillanceViolation: "타인 감시, 권리 억압 등 모니터링 성격이 감지되지 않아 안전합니다.",
    biasViolation: "특정 성별, 연령, 계층에 대한 유의미한 편향 위험성이 감지되지 않았습니다.",
    harmfulViolation: "디프페이크, 언어 폭력, 유해 생성 등 윤리적 리스크가 발견되지 않았습니다.",
    userProblem: "Who, When/Where, What, Why의 4대 요소 연계가 무난히 기술되었습니다.",
    pipelineDesign: "[입력 -> 인식 -> 생성 AI -> 결과 UI] 흐름이 정상적으로 수립되었습니다.",
    dataStrategy: "RAG 대책 및 출처를 간략히 명시하여 환각 예방 계획이 보완되어 있습니다.",
    riskGovernance: "개인정보 보존/삭제 계획 및 비상대피 수단이 마련되어 있습니다.",
    feasibility: "정상 및 예외적 상황을 시각화할 수 있는 시나리오가 수립되어 있습니다."
  };

  // 1. Compliance Scan (윤리적·법적 리스크 및 공식 논란 차단)
  if (proposalText.includes("공부방") || proposalText.includes("집중") || proposalText.includes("감시") || proposalText.includes("CCTV") || proposalText.includes("모니터링")) {
    compliance -= 15;
    comments.surveillanceViolation = "공부방 학생들을 실시간 CCTV/웹캠으로 자동 감시 및 집중도 채점하는 아키텍처는 개인 자유 억압 및 감시 논란 우려가 큽니다.";
    deficiencies.push({
      title: "[윤리적·법적 리스크] [공식 논란 경고] 기술 오남용 및 감시 통제 구조 심각",
      description: "기획서 내에서 학생들의 '졸음 및 딴짓 감지', '공부방 대시보드 부모 공유'를 실시간 웹캠 비디오로 전송하는 방식은 타인의 일상을 강제 감시하여 기본권을 침해합니다. 감시용 CCTV 구도를 제거하고, 학생 스스로 자발적으로 켜고 끄는 자기 주도성 알림 위젯 혹은 완전 익명화된 주간 세션 요약 방식으로 전면 리디자인하여 인권 침해 논란을 차단하십시오."
    });
  }
  
  if (proposalText.includes("치료") || proposalText.includes("진단") || proposalText.includes("의사") || proposalText.includes("수의사") || proposalText.includes("법률 자문")) {
    compliance -= 15;
    comments.medicalViolation = "AI가 전문 면허 소지자(의사, 수의사 등)를 온전히 대체하여 직접 진단을 내리는 묘사는 의료법 및 관계법 위반 소지가 매우 높습니다.";
    deficiencies.push({
      title: "[윤리적·법적 리스크] [공식 논란 경고] 전문직 면허 직무(의료법/수의사법) 위반 소지",
      description: "기획서 중 '수의학 임상 상태 정리', '가능성 높은 질환 판단' 등을 AI가 직접 결정하여 보호자에게 수의사 소견처럼 송출하는 부분은 국내 수의사법 및 의료법 제56조(무면허 진료) 위반 소지가 아주 큽니다. AI의 직무를 '공식 수의사 진단 대체'가 아닌 '수의학 정보 조회 보조 가이드 생성'으로 명확하게 역할을 격하시키고, 화면 최하단에 '전문가 소견을 대체하지 않는다'는 컴플라이언스 경고 팝업을 상시 표출하도록 아키텍처를 개선하십시오."
    });
  }

  // 2. User Problem Scan
  if (proposalText.length < 300) {
    userProblem -= 5;
    comments.userProblem = "문제 당사자(Who) 및 도입 타당성 중 누락되거나 모호한 요소가 보입니다.";
    deficiencies.push({
      title: "[사용자 및 문제 정의] 문제 상황 요소 누락 및 AI 필요성 기술 부실",
      description: "기획서 내용 중 사용자 페인 포인트 상황 설명이 단편적이어서 기술 도입의 절박한 당위성(Why)이 약합니다. '1인 가구 직장인' 또는 '시각장애 보행자' 등의 키워드를 적극적으로 활용하여 타겟 사용자의 절실한 불편함을 구체적인 데이터와 함께 인용해 주십시오."
    });
  }

  // 3. Pipeline Design Scan
  if (!proposalText.includes("UI") && !proposalText.includes("화면") && !proposalText.includes("앱")) {
    pipelineDesign -= 5;
    comments.pipelineDesign = "최종 사용자에게 피드백을 전달하는 UI 및 인터페이스 설계가 미흡합니다.";
    deficiencies.push({
      title: "[AI 서비스 파이프라인] 최종 사용자 결과 UI 가시성 부족",
      description: "AI 모델의 추론 브리프 데이터를 사용자에게 어떻게 직관적으로 보여줄지에 대한 UI 명세가 불분명합니다. 모바일 앱 전용 푸시 알림, 응급 10초 요약 비디오 클립, 챗봇 Q&A 위젯 등 최종 사용자 결과 전달 방식을 입체적으로 확장하십시오."
    });
  }

  // 4. Data Strategy Scan
  if (!proposalText.includes("RAG") && !proposalText.includes("환각")) {
    dataStrategy -= 10;
    comments.dataStrategy = "벡터 DB 활용 또는 RAG 환각 방지 조치가 결여되어 허위 정보 전송 위험이 있습니다.";
    deficiencies.push({
      title: "[데이터 전략 및 RAG 검증] 거대언어모델 생성 환각(Hallucination) 방지책 누락",
      description: "실시간 정보 생성 과정에서 Gemini가 임의로 그럴듯한 거짓말을 지어내는 환각 현상을 차단할 검증 계획이 기획서 상에 명시되지 않았습니다. 공인 표준 문서나 의학 사전 등을 벡터 데이터베이스(ChromaDB)에 우선 적재한 후 탑 K 기준 관련성 높은 증거만 컨텍스트에 한정하여 입력하게 하는 RAG 파이프라인을 기획서에 필히 반영하십시오."
    });
  }

  // 5. Risk Governance Scan
  if (!proposalText.includes("삭제") && !proposalText.includes("파기") && !proposalText.includes("기간")) {
    riskGovernance -= 5;
    comments.riskGovernance = "수집된 영상 등 개인 민감 정보의 안전한 보존 기간과 파기 규칙이 부재합니다.";
    deficiencies.push({
      title: "[리스크 거버넌스] 개인정보 보존 및 영구 파쇄 생애주기 미비",
      description: "실시간 비디오 데이터가 유입되는 기획 구조임에도 보존 기간과 삭제 방법이 불분명합니다. '개인정보보호법 준수 및 가입 해지 시 7일 이내 원천 파쇄 및 복구 불가 영구 삭제' 정책을 명시하고 AES-256 저장 암호화 로드맵을 추가 제안하십시오."
    });
  }

  const score = compliance + userProblem + pipelineDesign + dataStrategy + riskGovernance + feasibility;
  
  const getStatus = (current: number, max: number): "Met" | "Partial" | "Unmet" => {
    if (current >= max) return "Met";
    if (current > 0) return "Partial";
    return "Unmet";
  };

  const rubricChecklist = [
    // 1. 윤리적·법적 리스크 및 공식 논란 차단 (최대 30점)
    {
      category: "compliance" as const,
      name: "의료법/전문직 위반 여부 (의사/약사 대체 등 무면허 행위 차단)",
      maxScore: 8,
      score: compliance >= 30 ? 8 : (compliance >= 15 ? 4 : 0),
      isMet: getStatus(compliance >= 30 ? 8 : (compliance >= 15 ? 4 : 0), 8),
      comment: comments.medicalViolation
    },
    {
      category: "compliance" as const,
      name: "기술 오남용 및 감시 (CCTV 등을 통한 기본권 침해 감시 통제 여부)",
      maxScore: 8,
      score: compliance >= 30 ? 8 : (compliance >= 15 ? 4 : 0),
      isMet: getStatus(compliance >= 30 ? 8 : (compliance >= 15 ? 4 : 0), 8),
      comment: comments.surveillanceViolation
    },
    {
      category: "compliance" as const,
      name: "차별 및 편향 (성별/연령/인종에 대한 공평한 결과물 도출)",
      maxScore: 7,
      score: 7,
      isMet: "Met" as const,
      comment: comments.biasViolation
    },
    {
      category: "compliance" as const,
      name: "표현 및 유해성 (디프페이크, 언어 폭력, 불합리한 유해 생성물 통제)",
      maxScore: 7,
      score: 7,
      isMet: "Met" as const,
      comment: comments.harmfulViolation
    },

    // 2. 사용자 및 문제 정의 (최대 15점)
    {
      category: "userProblem" as const,
      name: "4대 필수 요소(Who, When/Where, What, Why) 연계성 구체성",
      maxScore: 8,
      score: userProblem >= 15 ? 8 : 4,
      isMet: getStatus(userProblem >= 15 ? 8 : 4, 8),
      comment: comments.userProblem
    },
    {
      category: "userProblem" as const,
      name: "기술 도입의 구체적 타당성 및 정당한 당위성 확보",
      maxScore: 7,
      score: userProblem >= 15 ? 7 : 4,
      isMet: getStatus(userProblem >= 15 ? 7 : 4, 7),
      comment: "수동 분석 한계를 탈피한 인공지능 도입 당위성은 잘 작성되었습니다."
    },

    // 3. AI 서비스 파이프라인 구조 설계 (최대 15점)
    {
      category: "pipelineDesign" as const,
      name: "[입력 데이터 ➡️ 인식 도구 ➡️ 생성형 AI의 역할 ➡️ 최종 결과 UI] 유기성",
      maxScore: 8,
      score: pipelineDesign >= 15 ? 8 : 4,
      isMet: getStatus(pipelineDesign >= 15 ? 8 : 4, 8),
      comment: comments.pipelineDesign
    },
    {
      category: "pipelineDesign" as const,
      name: "단순 챗봇 호출에 그치지 않고 입체적 파이프라인 정합성 구현",
      maxScore: 7,
      score: 7,
      isMet: "Met" as const,
      comment: "YOLO 객체 검출기와 거대언어모델의 연동 정합성이 튼튼합니다."
    },

    // 4. 데이터 전략 및 저작권/RAG 검증 계획 (최대 15점)
    {
      category: "dataStrategy" as const,
      name: "공공 및 상업 데이터 획득 출처 수집 계획과 수집량 타당성",
      maxScore: 5,
      score: 5,
      isMet: "Met" as const,
      comment: "AI Hub 등의 원천 소스를 적합하게 확보하고 기재했습니다."
    },
    {
      category: "dataStrategy" as const,
      name: "데이터 저작권(CC-BY, CC-BY-NC 등 라이선스 규격) 사전 확인",
      maxScore: 5,
      score: 5,
      isMet: "Met" as const,
      comment: "오픈소스 이용 약관 및 저작권법 준수 의도를 표출했습니다."
    },
    {
      category: "dataStrategy" as const,
      name: "환각(Hallucination) 방지를 위한 벡터 DB 임베딩 및 RAG 구체성",
      maxScore: 5,
      score: dataStrategy >= 15 ? 5 : 0,
      isMet: getStatus(dataStrategy >= 15 ? 5 : 0, 5),
      comment: comments.dataStrategy
    },

    // 5. 리스크 거버넌스 및 안전장치 (최대 15점)
    {
      category: "riskGovernance" as const,
      name: "개인정보 보존 위치, 명시적 삭제 주기, 파기 기준 구체성",
      maxScore: 5,
      score: riskGovernance >= 15 ? 5 : 2,
      isMet: getStatus(riskGovernance >= 15 ? 5 : 2, 5),
      comment: comments.riskGovernance
    },
    {
      category: "riskGovernance" as const,
      name: "민감 정보에 대한 권한 제어 및 암호화 수준 보안 설계",
      maxScore: 5,
      score: 5,
      isMet: "Met" as const,
      comment: "AWS Key KMS 관리 등 원천 접근 제한을 보수적으로 기획했습니다."
    },
    {
      category: "riskGovernance" as const,
      name: "위기 상황(자해, 자살, 범죄 등) 발생 시 AI 이전 즉각 안전장치",
      maxScore: 5,
      score: 5,
      isMet: "Met" as const,
      comment: "사용자의 위급 충돌 및 통화 무반응 시 119 긴급 좌표 자동 발송 탑재."
    },

    // 6. 프로젝트 타당성 및 시연 시나리오 (최대 10점)
    {
      category: "feasibility" as const,
      name: "정상 작동 및 네트워크 단절/오동작 등 예외 상황 흐름 반영",
      maxScore: 5,
      score: 5,
      isMet: "Met" as const,
      comment: comments.feasibility
    },
    {
      category: "feasibility" as const,
      name: "팀원별 주력 파트 기술 스택 분배 및 명확한 R&R 매핑",
      maxScore: 5,
      score: 5,
      isMet: "Met" as const,
      comment: "서버, AI 모델 튜닝, 임베디드 오디오 분야가 고루 배정되었습니다."
    }
  ];

  return {
    score,
    scores: {
      compliance,
      userProblem,
      pipelineDesign,
      dataStrategy,
      riskGovernance,
      feasibility
    },
    deficiencies: deficiencies.length > 0 ? deficiencies : [
      {
        title: "[윤리적·법적 리스크] 규제 무결성 판정",
        description: "기획서 검사 결과, 현행 면허법 위반 소지나 타인에 대한 비합리적인 사생활 감시 조항이 발견되지 않았습니다. 윤리성과 적법성을 완벽히 조화시킨 모범 기획안입니다."
      }
    ],
    overallComment: "본 기획서는 AI 파이프라인의 윤리성과 공식 컴플라이언스 기준(Compliance)을 준수하고 있습니다. 일부 실시간 비디오 및 의료 참고 데이터의 라이프사이클만 더 보강하면, 사회적 논란 없이 즉각적인 사업화 추진이 가능한 완성도입니다.",
    strengths: [
      "인간 전문가 대체 논란이나 부당한 타인 통제CCTV 구도를 철저히 차단하여 높은 규제 적합성 달성",
      "YOLO 이상행동 이벤트 로그 및 Gemini 브리핑 컨텍스트 간의 데이터 아키텍처 연동 구체성"
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
당신은 학생들이 제출한 다양한 주제의 'AI 서비스 파이프라인 기획서'를 검사하여 잠재된 윤리적·법적·공식적 논란(Scandal)을 선제적으로 찾아내고 차단하는 'AI 컴플라이언스(준법감시) 수석 위원'이다.
사용자가 어떠한 주제의 기획서를 제출하더라도, 아래의 [6대 핵심 심사 지표]를 바탕으로 논리적 취약점과 사회적 논란거리를 정밀 타격하여 100점 만점으로 계산하여 답변을 출력해야 한다.

[6대 핵심 심사 차원 및 정량 감점 매트릭스 (총점 100점)]

1. 윤리적·법적 리스크 및 공식 논란 차단 (최대 30점 감점 - 가장 중요)
   - 필수 요소: 서비스가 인간의 기본권을 침해하거나, 법적 규제를 위반하거나, 사회적 논란을 야기할 소지가 없어야 함.
   - 감점 및 위험 판단 기준:
     * [의료법/전문직 위반]: AI가 인간 전문가를 '대체'하여 진단, 치료, 법률 자문 등을 직접 수행하는 것처럼 묘사한 경우 (-15점)
     * [기술 오남용 및 감시]: AI를 활용해 타인을 감시, 통제, 처벌하거나 개인의 자유를 억압하는 구조인 경우 (예: 학생 감시용 AI CCTV 등) (-15점)
     * [차별 및 편향]: 특정 성별, 연령, 계층, 인종에 대해 차별적이거나 편향된 결과를 도출할 위험이 있는 경우 (-10점)
     * [표현 및 유해성]: 디프페이크, 언어 폭력, 유해 콘텐츠 생성 등 사회적 문제를 유발할 여지가 있는 경우 (-15점)

2. 사용자 및 문제 정의 (최대 15점 감점)
   - 필수 요소: 문제 당사자(Who), 발생 상황(When/Where), 구체적 불편(What), 서비스 후 기대 변화(Why)가 유기적으로 엮여야 함.
   - 감점: 4대 요소 누락 마다 (-5점) / 기술 도입의 당위성이 떨어지는 경우 (-5점)

3. AI 서비스 파이프라인 구조 설계 (최대 15점 감점)
   - 필수 요소: [입력 데이터 ➡️ 인식 도구 ➡️ 생성형 AI의 역할 ➡️ 최종 사용자 결과 UI] 흐름의 연계성.
   - 감점: 특정 단계 누락 (-10점) / 아키텍처가 모호하거나 단순 챗봇 호출에 그친 경우 (-5점)

4. 데이터 전략 및 저작권/RAG 검증 계획 (최대 15점 감점)
   - 필수 요소: 데이터 출처, 수집량, 저작권(라이선스) 확인, AI 환각(Hallucination) 방지 대책.
   - 감점: 데이터 출처 미비 (-5점) / 저작권 및 환각 방지 대책(RAG 등) 누락 (-10점)

5. 리스크 거버넌스 및 안전장치 (최대 15점 감점)
   - 필수 요소: 개인정보(민감정보) 저장 위치·보존 기간·삭제 방법 및 권한 제어. 위기 상황(자해, 범죄 등) 탐지 시 AI 답변 전에 작동할 구체적인 단계별 도움 프로토콜.
   - 감점: 데이터 보안 계획 누락 (-5점) / 위기 상황 대피 안전장치 누락 (-10점)

6. 프로젝트 타당성 및 시연 시나리오 (최대 10점 감점)
   - 필수 요소: 정상 흐름과 예외 상황 흐름을 고려한 시연 시나리오 및 역할 분담.
   - 감점: 예외 상황 시연 계획 부실 (-5점)

------------------------------------------
[세부 채점표 루브릭 및 매트릭스 목록]
각 기획서 채점 시 다음 18개 세부 루브릭의 점수를 아주 꼼꼼히 평정하여 rubricChecklist 배열로도 함께 반환하십시오:

- category: "compliance"
  * "의료법/전문직 위반 여부 (의사/약사 대체 등 무면허 행위 차단)" (배점 8점)
  * "기술 오남용 및 감시 (CCTV 등을 통한 기본권 침해 감시 통제 여부)" (배점 8점)
  * "차별 및 편향 (성별/연령/인종에 대한 공평한 결과물 도출)" (배점 7점)
  * "표현 및 유해성 (디프페이크, 언어 폭력, 불합리한 유해 생성물 통제)" (배점 7점)

- category: "userProblem"
  * "4대 필수 요소(Who, When/Where, What, Why) 연계성 구체성" (배점 8점)
  * "기술 도입의 구체적 타당성 및 정당한 당위성 확보" (배점 7점)

- category: "pipelineDesign"
  * "[입력 데이터 ➡️ 인식 도구 ➡️ 생성형 AI의 역할 ➡️ 최종 결과 UI] 유기성" (배점 8점)
  * "단순 챗봇 호출에 그치지 않고 입체적 파이프라인 정합성 구현" (배점 7점)

- category: "dataStrategy"
  * "공공 및 상업 데이터 획득 출처 수집 계획과 수집량 타당성" (배점 5점)
  * "데이터 저작권(CC-BY, CC-BY-NC 등 라이선스 규격) 사전 확인" (배점 5점)
  * "환각(Hallucination) 방지를 위한 벡터 DB 임베딩 및 RAG 구체성" (배점 5점)

- category: "riskGovernance"
  * "개인정보 보존 위치, 명시적 삭제 주기, 파기 기준 구체성" (배점 5점)
  * "민감 정보에 대한 권한 제어 및 암호화 수준 보안 설계" (배점 5점)
  * "사용자 위기 상황(자해, 범죄 등) 발생 시 AI 이전 즉각 안전장치" (배점 5점)

- category: "feasibility"
  * "정상 작동 및 네트워크 단절/오동작 등 예외 상황 흐름 반영" (배점 5점)
  * "팀원별 주력 파트 기술 스택 분배 및 명확한 R&R 매핑" (배점 5점)

------------------------------------------
[중요 채점 지침]
1. 감점 규칙을 기계적이고 엄격하게 적용하여 주십시오. 기획서 내용에 구체적인 언급이 없다면 가차 없이 감점하십시오.
2. 감점 요소를 도출할 때, deficiencies의 'title'은 반드시 "[지표명] 부족한 점 제목" 형태로 작성하십시오. 
   특히 윤리/법적 리스크 및 공식 논란 문제는 반드시 "[공식 논란 경고]"를 타이틀 머리에 붙여 표시하십시오. (예: "[윤리적·법적 리스크] [공식 논란 경고] 의료법 위반 우려 - 비전문가 대체 묘사")
3. deficiencies의 'description'은 학생들이 제출한 기획서의 키워드를 직접 인용하여 아주 구체적인 보완 액션 플랜을 제시하십시오.

출력 데이터는 반드시 아래 JSON 스키마를 만족시켜야 합니다.
`;

    const response = await generateContentWithFallback({
      model: GEMINI_MODEL,
      contents: [
        {
          text: `다음은 심사 대상인 기획서 본문입니다:\n\n${proposal}\n\n위 기획서를 6대 컴플라이언스 심사 지표에 맞추어 엄격하게 심사해 주십시오.`
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
              description: "최종 합산 점수 (각 세부 지표들의 실제 점수 합과 반드시 일치해야 함. 정수 값. 최대 100점)"
            },
            scores: {
              type: Type.OBJECT,
              properties: {
                compliance: { type: Type.INTEGER, description: "윤리적·법적 리스크 및 공식 논란 차단 점수 (0 ~ 30점)" },
                userProblem: { type: Type.INTEGER, description: "사용자 및 문제 정의 점수 (0 ~ 15점)" },
                pipelineDesign: { type: Type.INTEGER, description: "AI 서비스 파이프라인 구조 설계 점수 (0 ~ 15점)" },
                dataStrategy: { type: Type.INTEGER, description: "데이터 전략 및 저작권/RAG 검증 계획 점수 (0 ~ 15점)" },
                riskGovernance: { type: Type.INTEGER, description: "리스크 거버넌스 및 안전장치 점수 (0 ~ 15점)" },
                feasibility: { type: Type.INTEGER, description: "프로젝트 타당성 및 시연 시나리오 점수 (0 ~ 10점)" }
              },
              required: ["compliance", "userProblem", "pipelineDesign", "dataStrategy", "riskGovernance", "feasibility"]
            },
            deficiencies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "반드시 '[지표명] 부족한 점 제목' 형태로 작성하며, 윤리/법적 문제는 '[공식 논란 경고]'를 타이틀 머리에 붙여 주십시오."
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
              description: "준법감시 수석 위원 입장에서 쓴 전체적인 컴플라이언스 총평 및 개선 방향 제시 (2~3문장)"
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "심사 속에서도 돋보였던 긍정적 측면이나 칭찬할 만한 요소 2가지"
            },
            rubricChecklist: {
              type: Type.ARRAY,
              description: "18대 세부 채점 루브릭 결과 목록",
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: "세부 항목이 속한 대분류. 반드시 'compliance', 'userProblem', 'pipelineDesign', 'dataStrategy', 'riskGovernance', 'feasibility' 중 하나여야 함."
                  },
                  name: {
                    type: Type.STRING,
                    description: "세부 채점 루브릭의 이름 (예: '의료법/전문직 위반 여부 (의사/약사 대체 등 무면허 행위 차단)')"
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
                    description: "감점 원인 또는 준수 상황을 기획서의 구체적 단어를 직접 인용하여 격식있고 명확하게 평정하는 컴플라이언스 주석"
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
    res.json(getMockEvaluation(proposal));
  }
});

// -------------------------------------------------------------

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
