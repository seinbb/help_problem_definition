import React, { useState, useEffect, useRef } from "react";
import { 
  Award, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Play, 
  Send, 
  Sparkles, 
  Copy, 
  ArrowRight, 
  Lock, 
  ShieldAlert, 
  Users, 
  Database, 
  HelpCircle, 
  BrainCircuit, 
  Check, 
  BookOpen, 
  Info, 
  MessageSquare,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { sampleProposals } from "./samples";
import { EvaluationResult, ChatMessage } from "./types";

// Custom simple markdown-to-html renderer to avoid third-party build issues
const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split("\n");
  return (
    <div className="space-y-4 text-gray-700 leading-relaxed font-sans text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("# ")) {
          return <h1 key={idx} className="text-xl font-bold font-display text-gray-900 border-b border-gray-200 pb-2 mt-6">{trimmed.slice(2)}</h1>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={idx} className="text-lg font-semibold font-display text-gray-900 mt-5 flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-600" />{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith("### ")) {
          return <h3 key={idx} className="text-md font-medium text-gray-900 mt-4">{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1 my-1">
              <li>{trimmed.slice(2)}</li>
            </ul>
          );
        }
        if (trimmed.match(/^\d+\./)) {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1 my-1">
              <li>{trimmed.replace(/^\d+\.\s*/, "")}</li>
            </ol>
          );
        }
        if (trimmed === "") {
          return <div key={idx} className="h-2" />;
        }
        
        // Handle bold parsing **text**
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="my-1">
            {parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={pIdx} className="text-gray-900 font-semibold">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default function App() {
  const [proposal, setProposal] = useState<string>("");
  const [activeSample, setActiveSample] = useState<string>("custom");
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationStage, setEvaluationStage] = useState<string>("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  
  // Custom expandable accordions for deficiencies
  const [expandedDeficiencies, setExpandedDeficiencies] = useState<Record<number, boolean>>({});
  
  // Proposal Improvement
  const [isImproving, setIsImproving] = useState<boolean>(false);
  const [improvedProposal, setImprovedProposal] = useState<string>("");
  const [showImprovementTab, setShowImprovementTab] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Evaluator Coach Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isChatting, setIsChatting] = useState<boolean>(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Set default proposal on load
  useEffect(() => {
    // Load first sample as default
    const firstSample = sampleProposals[0];
    setProposal(firstSample.content);
    setActiveSample(firstSample.id);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSelectSample = (sampleId: string) => {
    setActiveSample(sampleId);
    if (sampleId === "custom") {
      setProposal("");
    } else {
      const selected = sampleProposals.find(s => s.id === sampleId);
      if (selected) {
        setProposal(selected.content);
      }
    }
    // Reset output states when sample changes
    setResult(null);
    setImprovedProposal("");
    setShowImprovementTab(false);
    setChatMessages([]);
  };

  const handleStartEvaluation = async () => {
    if (!proposal.trim()) return;

    setIsEvaluating(true);
    setResult(null);
    setImprovedProposal("");
    setShowImprovementTab(false);
    setChatMessages([]);

    const stages = [
      "1단계: [사용자 및 문제 정의] Who, When, What, Why 유기적 결합 상태 검증 중...",
      "2단계: [파이프라인 구조 설계] 데이터 입력 ➡️ 감지 ➡️ LLM ➡️ UI 연계 아키텍처 진단 중...",
      "3단계: [데이터 전략 및 RAG] 저작권 라이선스 확보 여부 및 환각 제어 기획 심사 중...",
      "4단계: [리스크 거버넌스] 개인정보 라이프사이클 및 위기 대피 프로토콜 무결성 채점 중...",
      "5단계: [프로젝트 타당성] 예외 상황 시연 시나리오 구성 및 역할 분담 타당성 체크 중...",
      "최종 평정: AI 수석 심사위원 종합 평가 보고서 작성 중..."
    ];

    // Simulate review stages sequentially for a rich tactile experience
    for (let i = 0; i < stages.length; i++) {
      setEvaluationStage(stages[i]);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal })
      });

      if (!response.ok) {
        throw new Error("서버 심사 요청 중 오류가 발생했습니다.");
      }

      const data = await response.json();
      setResult(data);
      
      // Initialize deficiency expandable states
      const initialExp: Record<number, boolean> = {};
      data.deficiencies.forEach((_: any, idx: number) => {
        initialExp[idx] = true; // start expanded for visibility
      });
      setExpandedDeficiencies(initialExp);

      // Pre-populate chat with welcome message from the reviewer
      setChatMessages([
        {
          id: "welcome",
          role: "model",
          content: `안녕하십니까. 제출하신 "${proposal.slice(0, 30).replace(/\n/g, ' ')}..." 기획서의 정량 심사를 완료하였습니다. 종합 점수는 ${data.score}점입니다. 감점된 각 차원의 세부 지표 분석 보고서를 확인해 주십시오. 피드백 결과에 대해 의문이 있으시거나, 어떻게 보완해야 할지 구체적인 기술 스택을 문의하고 싶으시다면 언제든 편하게 아래 챗창에 남겨주십시오.`,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "심사 도중 예상치 못한 오류가 발생했습니다.");
    } finally {
      setIsEvaluating(false);
      setEvaluationStage("");
    }
  };

  const handleGetImprovement = async () => {
    if (!result || isImproving) return;

    setIsImproving(true);
    try {
      const response = await fetch("/api/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal, deficiencies: result.deficiencies })
      });

      if (!response.ok) {
        throw new Error("보완 요청 중 오류가 발생했습니다.");
      }

      const data = await response.json();
      setImprovedProposal(data.improvedProposal);
      setShowImprovementTab(true);
    } catch (err: any) {
      console.error(err);
      alert("개선 제안서를 작성하는 도중 오류가 발생했습니다.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || isChatting || !result) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: currentMessage,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setCurrentMessage("");
    setIsChatting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal,
          evaluation: result,
          messages: [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error("답변을 전송하지 못했습니다.");
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      };

      setChatMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: "err",
        role: "model",
        content: "죄송합니다. 심사위원과 대화 중 연결이 불안정합니다. 잠시 후 다시 시도해 주십시오.",
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleCopyImproved = () => {
    if (!improvedProposal) return;
    navigator.clipboard.writeText(improvedProposal);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const toggleDeficiency = (idx: number) => {
    setExpandedDeficiencies(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Get color configurations based on score ranges aligned with Technical Dashboard
  const getScoreColorClass = (score: number) => {
    if (score >= 90) return {
      text: "text-[#141414]",
      bg: "bg-white",
      border: "border-2 border-[#141414]",
      progress: "bg-[#141414]",
      gauge: "#141414",
      grade: "우수 (Excellent)",
      gradeColor: "bg-[#141414] text-[#E4E3E0] border border-[#141414]"
    };
    if (score >= 70) return {
      text: "text-[#141414]",
      bg: "bg-white",
      border: "border-2 border-[#141414]",
      progress: "bg-[#141414]",
      gauge: "#dc2626",
      grade: "보통 (Satisfactory)",
      gradeColor: "bg-red-600 text-white border border-[#141414]"
    };
    return {
      text: "text-[#141414]",
      bg: "bg-white",
      border: "border-2 border-[#141414]",
      progress: "bg-red-600",
      gauge: "#dc2626",
      grade: "재검토 필요 (Revision)",
      gradeColor: "bg-red-600 text-white border border-[#141414]"
    };
  };

  const activeColor = result ? getScoreColorClass(result.score) : null;

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans selection:bg-red-200 border-4 md:border-8 border-[#141414]">
      {/* Top Banner / Header */}
      <header className="bg-[#141414] text-[#E4E3E0] px-6 py-4 sticky top-0 z-40 border-b border-[#141414]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 bg-red-600 rounded-full animate-pulse"></div>
            <div>
              <h1 className="text-xs font-bold font-mono tracking-[0.2em] uppercase text-white flex items-center gap-2">
                AI Senior Judge | Pipeline Evaluation Protocol v4.0.2
              </h1>
              <p className="text-[10px] font-mono opacity-70 mt-0.5 uppercase tracking-wider">
                5대 핵심 심사 차원 기반 엄격한 학생 기획서 평가 및 오피니언 리더 코칭 시스템
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-[#2c2c2c] p-1.5 rounded-none text-[10px] font-mono text-[#E4E3E0] border border-[#444444]">
            <span className="px-2 py-0.5 bg-[#141414] text-white font-semibold">
              GEMINI 3.5 FLASH
            </span>
            <span className="px-1 uppercase opacity-80">RIGOROUS_MODE_ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Student Proposal Input (lg:col-span-5) */}
        <div id="proposal-input-section" className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Sample Selector Card */}
          <div className="bg-white/40 p-5 rounded-none border border-[#141414] shadow-none">
            <div className="flex items-center justify-between mb-4 border-b border-[#141414] pb-2">
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#141414] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#141414]" /> [TEMPLATE] SELECT EVALUATION SUBJECT
              </h2>
              <span className="text-[10px] bg-[#141414] text-[#E4E3E0] px-2.5 py-1 rounded-none font-mono uppercase">
                4 SAMPLES LOADED
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {sampleProposals.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample.id)}
                  className={`w-full text-left p-3 rounded-none border text-xs transition-all duration-150 flex flex-col gap-1.5 cursor-pointer hover:bg-[#141414] hover:text-white ${
                    activeSample === sample.id 
                      ? "border-[#141414] bg-[#141414] text-[#E4E3E0]" 
                      : "border-[#141414] bg-white/60 text-[#141414]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold font-mono tracking-tight text-xs uppercase">
                      {sample.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-none text-[9px] font-mono border uppercase ${
                      activeSample === sample.id ? "bg-[#2c2c2c] text-white border-white/30" : "bg-white/90 text-[#141414] border-[#141414]"
                    }`}>
                      {sample.tag}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] w-full mt-1 border-t border-dashed border-[#141414]/20 pt-1 font-mono">
                    <span className="opacity-80">
                      BY: {sample.author}
                    </span>
                    <span className={`font-mono font-bold ${
                      activeSample === sample.id ? "text-amber-300" : "text-amber-700"
                    }`}>
                      {sample.expectedScoreRange}
                    </span>
                  </div>
                </button>
              ))}

              <button
                onClick={() => handleSelectSample("custom")}
                className={`w-full text-left p-3 rounded-none border-2 border-dashed text-xs font-mono uppercase transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                  activeSample === "custom" 
                    ? "border-[#141414] bg-[#141414] text-white font-bold" 
                    : "border-[#141414] bg-white/80 text-[#141414] hover:bg-[#141414] hover:text-white font-bold"
                }`}
              >
                <Sparkles className="w-4 h-4 text-red-600" /> [CUSTOM] WRITE NEW PROPOSAL
              </button>
            </div>
          </div>

          {/* Proposal Editor Area */}
          <div className="bg-white/50 p-5 rounded-none border border-[#141414] flex-1 flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between mb-3 border-b border-[#141414] pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#141414]" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#141414]">
                  {activeSample === "custom" ? "EDITOR_INPUT_WORKSPACE" : "PROPOSAL_DOCUMENT_TEXT"}
                </h3>
              </div>
              <span className="text-[10px] text-[#141414] font-mono">
                LENGTH_METRIC: {proposal.length} CHARS
              </span>
            </div>

            <div className="relative flex-1 flex flex-col">
              <textarea
                value={proposal}
                onChange={(e) => {
                  setProposal(e.target.value);
                  if (activeSample !== "custom") {
                    setActiveSample("custom");
                  }
                }}
                disabled={isEvaluating}
                placeholder={`여기에 학생들이 작성한 'AI 서비스 파이프라인 기획서'를 붙여넣으십시오.
                
[기획서 포함 예시 구성]
1. 사용자 및 문제 정의
2. AI 서비스 파이프라인 구조 설계
3. 데이터 전략 및 신뢰성/RAG 검증 계획
4. 리스크 거버넌스 및 안전장치
5. 프로젝트 타당성 및 시연 시나리오

위 양식을 갖출수록 감점을 피할 수 있습니다.`}
                className="w-full flex-1 p-4 rounded-none border border-[#141414] focus:outline-hidden text-xs font-mono leading-relaxed resize-none bg-white text-[#141414] disabled:opacity-75"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <button
                onClick={() => setProposal("")}
                disabled={isEvaluating || !proposal}
                className="py-2.5 px-4 rounded-none border border-[#141414] text-xs font-mono uppercase font-bold text-[#141414] hover:bg-[#141414] hover:text-white transition-all duration-150 disabled:opacity-50 cursor-pointer"
              >
                CLEAR_INPUT
              </button>
              
              <button
                onClick={handleStartEvaluation}
                disabled={isEvaluating || !proposal.trim()}
                className="col-span-2 py-2.5 px-4 rounded-none bg-red-600 text-white border border-[#141414] hover:bg-red-700 text-xs font-mono uppercase font-bold transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-none"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>RUNNING_CRITIQUE_ALGORITHM...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>LAUNCH_EVALUATION_PROTOCOL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Scoring Results & Coach (lg:col-span-7) */}
        <div id="results-and-coaching-section" className="lg:col-span-7 flex flex-col gap-6">
          
          {/* 1. Loading State */}
          {isEvaluating && (
            <div className="bg-white/50 p-8 rounded-none border border-[#141414] shadow-none flex flex-col items-center justify-center min-h-[500px] text-center gap-6 animate-pulse">
              <div className="w-12 h-12 bg-[#141414] flex items-center justify-center text-white border border-white">
                <RefreshCw className="w-6 h-6 text-red-600 animate-spin" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono tracking-widest text-[#141414] uppercase">
                  [PROCESSING_EVALUATION_PROTOCOL]
                </h3>
                <p className="text-[11px] text-[#141414] max-w-sm leading-relaxed font-sans opacity-85">
                  AI 수석 심사위원단이 [5대 핵심 심사 차원 및 감점 매트릭스] 기준에 입각해 제출물의 각 조항을 가차 없이 진단하고 있습니다.
                </p>
              </div>
              
              <div className="bg-[#141414] text-[#E4E3E0] font-mono text-xs p-4 rounded-none border border-[#141414] max-w-md w-full text-left shadow-none">
                <div className="flex items-center gap-2 mb-2 border-b border-white/20 pb-1">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                  <span className="text-[9px] text-[#E4E3E0] font-bold uppercase tracking-wider">Reviewer Engine Log</span>
                </div>
                <div className="text-[10px] tracking-tight">{evaluationStage}</div>
              </div>
            </div>
          )}

          {/* 2. Empty State (Before Evaluation) */}
          {!isEvaluating && !result && (
            <div className="bg-white/40 p-6 rounded-none border border-[#141414] shadow-none flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-[#141414] pb-2">
                  <Award className="w-5 h-5 text-[#141414]" />
                  <h3 className="text-xs font-bold font-mono tracking-wider text-[#141414] uppercase">AI 수석 심사위원 5대 핵심 평가 기준 가이드</h3>
                </div>
                
                <p className="text-[11px] text-[#141414] mb-6 leading-relaxed opacity-90">
                  본 시스템은 교육부 및 실무 가이드라인에 근거한 아래 5가지 정량 심사 차원을 적용합니다. 누락된 요소가 있을 시 정해진 감점률이 칼같이 차감되오니 심사 시작 전 꼼꼼히 원본을 점검해 주십시오.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-none border border-[#141414] bg-white/70 text-xs flex gap-3">
                    <div className="font-bold text-[#141414] font-mono text-xs mt-0.5">[01]</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-[#141414] font-mono text-xs uppercase">사용자 및 문제 정의 (20점)</h4>
                      <p className="text-[#141414] leading-relaxed text-[10px] opacity-80">문제 당사자(Who), 발생 상황(When/Where), 구체적 불편(What), 기대 변화(Why)의 4대 요소가 한 문장으로 명시되어야 함. (요소당 -5점 감점)</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-none border border-[#141414] bg-white/70 text-xs flex gap-3">
                    <div className="font-bold text-[#141414] font-mono text-xs mt-0.5">[02]</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-[#141414] font-mono text-xs uppercase">AI 파이프라인 구조 (25점)</h4>
                      <p className="text-[#141414] leading-relaxed text-[10px] opacity-80">데이터 흐름이 [입력데이터 ➡️ 인식도구(모델/센서) ➡️ 생성형 AI 핵심역할 ➡️ 최종 UI] 순서로 완성되어야 함. (단계 누락 시 -10점 감점)</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-none border border-[#141414] bg-white/70 text-xs flex gap-3">
                    <div className="font-bold text-[#141414] font-mono text-xs mt-0.5">[03]</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-[#141414] font-mono text-xs uppercase">데이터 전략 및 RAG (25점)</h4>
                      <p className="text-[#141414] leading-relaxed text-[10px] opacity-80">데이터 수집/정제 기준, 라이선스 체크, LLM 생성 환각(Hallucination) 방지용 RAG 세부 대책 수립 필수. (데이터 미비 -10점, RAG 누락 -15점)</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-none border border-[#141414] bg-white/70 text-xs flex gap-3">
                    <div className="font-bold text-[#141414] font-mono text-xs mt-0.5">[04]</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-[#141414] font-mono text-xs uppercase">리스크 거버넌스 (20점)</h4>
                      <p className="text-[#141414] leading-relaxed text-[10px] opacity-80">개인정보 라이프사이클(저장/기간/삭제) 및 사용자의 안전 위협 감지 시 동작할 구체적 위기 상황 단계별 도움 절차 필수. (위기 대피 프로토콜 누락 시 -15점)</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-none border border-[#141414] bg-white/70 text-xs flex gap-3 mt-4">
                  <div className="font-bold text-[#141414] font-mono text-xs mt-0.5">[05]</div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#141414] font-mono text-xs uppercase">타당성 및 시연 시나리오 (10점)</h4>
                    <p className="text-[#141414] leading-relaxed text-[10px] opacity-80">정상적 연동 및 돌발적 예외 사항(통신 장애 등)을 고려한 실질적 시연 시나리오 및 구체적 팀원 역할 분담 비중 작성. (누락 시 -5점)</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#141414] pt-5 mt-6 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#141414] gap-4 font-mono uppercase">
                <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-[#141414]" /> 왼쪽 에디터에서 기획서 중 하나를 택하거나 작성한 후 심사를 요청하십시오.</span>
                <span className="font-bold">VERDICT VERSION 1.2.0</span>
              </div>
            </div>
          )}

          {/* 3. Evaluation Results Rendered */}
          {!isEvaluating && result && activeColor && (
            <div className="space-y-6">
              
              {/* Score & Stamp Header Card */}
              <div className="bg-white/50 p-6 rounded-none border border-[#141414] shadow-none relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-radial from-red-600/5 to-transparent pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left Column: Grade & Status */}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider bg-[#141414] text-[#E4E3E0] px-2.5 py-1 rounded-none border border-[#141414]">
                        EVAL_DECISION_PROTOCOL
                      </span>
                      <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-none border uppercase ${activeColor.gradeColor}`}>
                        GRADE_{activeColor.grade}
                      </span>
                    </div>

                    <h2 className="text-base font-bold font-mono uppercase tracking-tight text-[#141414]">
                      기획서 다차원 정량 심사 보고서
                    </h2>
                    
                    <p className="text-[11px] text-[#141414] opacity-80 max-w-md leading-relaxed">
                      본 평가는 AI 서비스 기획서 제출물을 정량 심사 기준표에 따라 아주 정밀하게 분석하여 매긴 신뢰할 수 있는 수석 심사 결과입니다.
                    </p>
                  </div>

                  {/* Right Column: Circular Score Gauge */}
                  <div className="flex flex-col items-center justify-center self-center md:self-auto shrink-0 pr-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      {/* SVG Gauge Circle */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="#141414"
                          strokeWidth="6"
                          fill="transparent"
                          className="opacity-10"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke={activeColor.gauge === "#10b981" ? "#141414" : activeColor.gauge === "#f59e0b" ? "#dc2626" : "#b91c1c"}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={2 * Math.PI * 52 * (1 - result.score / 100)}
                          strokeLinecap="square"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      {/* Absolute Center Score */}
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold font-mono text-[#141414] leading-none">
                          {result.score}
                        </span>
                        <span className="text-[9px] text-[#141414] font-bold font-mono tracking-wider uppercase mt-1">
                          VAL: {result.score} / 100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Comment Certificate-style Section */}
                <div className="mt-5 p-4 rounded-none border border-[#141414] bg-white/80 relative">
                  <div className="absolute right-4 bottom-4 opacity-[0.04] select-none pointer-events-none transform rotate-12">
                    <Award className="w-24 h-24 text-[#141414]" />
                  </div>
                  <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#141414] mb-1.5 flex items-center gap-1.5">
                    ✍️ [JUDGE_OVERALL_SUMMARY]
                  </h4>
                  <p className="text-xs text-[#141414] leading-relaxed font-sans font-medium">
                    "{result.overallComment}"
                  </p>
                </div>
              </div>

              {/* 5 Dimensions Segment Breakdown Grid */}
              <div className="bg-white/50 p-5 rounded-none border border-[#141414] shadow-none space-y-4">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414] flex items-center gap-2 border-b border-[#141414]/10 pb-2">
                  <BrainCircuit className="w-4 h-4 text-[#141414]" /> [METRIC_BREAKDOWN] 5대 핵심 심사 차원별 세부 득점표
                </h3>

                <div className="space-y-3.5">
                  {/* D1 */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#141414] font-bold text-[11px]">
                      <span>[01] 사용자 및 문제 정의 (Who, When, What, Why)</span>
                      <span>{result.scores.userProblem} / 20점</span>
                    </div>
                    <div className="w-full bg-white h-3 rounded-none border border-[#141414] overflow-hidden p-[2px]">
                      <div 
                        className="h-full bg-[#141414] transition-all duration-500"
                        style={{ width: `${(result.scores.userProblem / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* D2 */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#141414] font-bold text-[11px]">
                      <span>[02] AI 서비스 파이프라인 구조 설계</span>
                      <span>{result.scores.pipelineDesign} / 25점</span>
                    </div>
                    <div className="w-full bg-white h-3 rounded-none border border-[#141414] overflow-hidden p-[2px]">
                      <div 
                        className="h-full bg-[#141414] transition-all duration-500"
                        style={{ width: `${(result.scores.pipelineDesign / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* D3 */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#141414] font-bold text-[11px]">
                      <span>[03] 데이터 전략 및 신뢰성/RAG 검증 계획</span>
                      <span>{result.scores.dataStrategy} / 25점</span>
                    </div>
                    <div className="w-full bg-white h-3 rounded-none border border-[#141414] overflow-hidden p-[2px]">
                      <div 
                        className="h-full bg-[#141414] transition-all duration-500"
                        style={{ width: `${(result.scores.dataStrategy / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* D4 */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#141414] font-bold text-[11px]">
                      <span>[04] 리스크 거버넌스 및 안전장치</span>
                      <span>{result.scores.riskGovernance} / 20점</span>
                    </div>
                    <div className="w-full bg-white h-3 rounded-none border border-[#141414] overflow-hidden p-[2px]">
                      <div 
                        className="h-full bg-[#141414] transition-all duration-500"
                        style={{ width: `${(result.scores.riskGovernance / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* D5 */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#141414] font-bold text-[11px]">
                      <span>[05] 프로젝트 타당성 및 시연 시나리오</span>
                      <span>{result.scores.feasibility} / 10점</span>
                    </div>
                    <div className="w-full bg-white h-3 rounded-none border border-[#141414] overflow-hidden p-[2px]">
                      <div 
                        className="h-full bg-[#141414] transition-all duration-500"
                        style={{ width: `${(result.scores.feasibility / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 17대 세부 채점표 (17-Point Granular Checklist) */}
              {result.rubricChecklist && result.rubricChecklist.length > 0 && (
                <div className="bg-white/50 p-5 rounded-none border border-[#141414] shadow-none space-y-4">
                  <div className="flex items-center justify-between border-b border-[#141414]/10 pb-2">
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414] flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" /> [17_POINT_RUBRIC_CHECKLIST] 17대 세부 루브릭 채점표
                    </h3>
                    <span className="text-[10px] bg-red-600 text-white font-mono px-2 py-0.5 uppercase font-bold">strict_grading_mode</span>
                  </div>

                  <p className="text-[11px] text-[#141414] leading-relaxed opacity-80">
                    각 대분류별 세부 평가 항목들의 합격 여부와 감점 사유, 수석 심사위원의 냉철한 1:1 피드백 내용입니다.
                  </p>

                  <div className="space-y-4">
                    {[
                      { key: "userProblem", label: "[01] 사용자 및 문제 정의", icon: Users, color: "border-blue-600" },
                      { key: "pipelineDesign", label: "[02] AI 서비스 파이프라인 구조 설계", icon: BrainCircuit, color: "border-purple-600" },
                      { key: "dataStrategy", label: "[03] 데이터 전략 및 RAG 검증 계획", icon: Database, color: "border-amber-600" },
                      { key: "riskGovernance", label: "[04] 리스크 거버넌스 및 안전장치", icon: ShieldAlert, color: "border-red-600" },
                      { key: "feasibility", label: "[05] 프로젝트 타당성 및 시연 시나리오", icon: Award, color: "border-emerald-600" }
                    ].map((catGroup) => {
                      const items = result.rubricChecklist!.filter(item => item.category === catGroup.key);
                      const IconComponent = catGroup.icon;
                      return (
                        <div key={catGroup.key} className="border border-[#141414] bg-white rounded-none p-3 space-y-2">
                          <div className="flex items-center gap-2 border-b border-[#141414]/10 pb-1.5 mb-1.5">
                            <IconComponent className="w-4 h-4 text-[#141414]" />
                            <h4 className="text-xs font-bold font-mono text-[#141414] uppercase">{catGroup.label}</h4>
                          </div>

                          <div className="divide-y divide-gray-100">
                            {items.map((item, itemIdx) => {
                              const badgeColor = 
                                item.isMet === "Met" 
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-300" 
                                  : item.isMet === "Partial"
                                    ? "text-amber-700 bg-amber-50 border-amber-300"
                                    : "text-rose-700 bg-rose-50 border-rose-300";
                              
                              const iconIndicator = 
                                item.isMet === "Met" 
                                  ? "[✓]" 
                                  : item.isMet === "Partial"
                                    ? "[!]"
                                    : "[✗]";

                              return (
                                <div key={itemIdx} className="py-2.5 flex flex-col md:flex-row md:items-start justify-between gap-3 first:pt-0 last:pb-0">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-none border ${badgeColor}`}>
                                        {iconIndicator} {item.isMet.toUpperCase()}
                                      </span>
                                      <span className="text-xs font-bold font-sans text-gray-900 leading-none">
                                        {item.name}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 font-sans pl-1">
                                      {item.comment}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-none border border-gray-200">
                                      {item.score} / {item.maxScore}점
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strengths & Weaknesses Detailed Feedback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Strengths Column (Good points) */}
                <div className="bg-white/40 p-5 rounded-none border border-[#141414] shadow-none space-y-3">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414] flex items-center gap-1.5 border-b border-[#141414]/10 pb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" /> [STRENGTH_MATRIX]
                  </h4>
                  <ul className="space-y-2.5">
                    {result.strengths.map((strength, sIdx) => (
                      <li key={sIdx} className="text-xs text-[#141414] flex gap-2 leading-relaxed">
                        <span className="text-[#141414] font-bold mt-0.5 shrink-0">[+]</span>
                        <span className="opacity-90">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Deficiencies Column (Weak points) */}
                <div className="bg-white/40 p-5 rounded-none border border-[#141414] shadow-none space-y-3">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414] flex items-center gap-1.5 border-b border-[#141414]/10 pb-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> [DEFICIENCY_LOGS]
                  </h4>
                  {result.deficiencies.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-bold font-mono uppercase">NO DETECTED DEFICIENCIES. EXCELLENT QUALITY.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {result.deficiencies.map((def, dIdx) => (
                        <div key={dIdx} className="border border-[#141414] rounded-none overflow-hidden">
                          <button
                            onClick={() => toggleDeficiency(dIdx)}
                            className="w-full text-left bg-white p-2.5 flex items-center justify-between gap-2 text-xs font-bold font-mono text-[#141414] cursor-pointer hover:bg-[#141414] hover:text-white transition-colors"
                          >
                            <span className="truncate leading-tight">{def.title}</span>
                            {expandedDeficiencies[dIdx] ? (
                              <ChevronUp className="w-3.5 h-3.5 text-inherit shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-inherit shrink-0" />
                            )}
                          </button>
                          
                          {expandedDeficiencies[dIdx] && (
                            <div className="p-3 bg-white border-t border-[#141414] text-xs text-[#141414] leading-relaxed space-y-2">
                              <p className="font-bold font-mono uppercase text-[10px] tracking-wider text-red-600">🔎 DETAILED_CRITIQUE & MITIGATION_PROTOCOL</p>
                              <p className="bg-[#E4E3E0] p-2.5 rounded-none font-mono text-[10px] text-[#141414] leading-normal border-l-4 border-red-600">
                                {def.description}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 100-Point AI Revision Section Generator */}
              <div className="bg-[#141414] text-white p-5 rounded-none border border-[#141414] shadow-none flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold font-mono uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                    <span>[RECOMMENDED_REVISION_DRAFT]</span>
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase font-mono tracking-tight">지적받은 요소를 모두 보완한 A+ 합격 기획서 자동 작성</h4>
                  <p className="text-xs text-[#E4E3E0] opacity-80 leading-relaxed max-w-lg">
                    감점 요소를 보강하여 100점 만점 기준으로 수석 심사위원이 직접 첨삭한 완벽한 템플릿 기획서 전문을 생성합니다.
                  </p>
                </div>

                <button
                  onClick={handleGetImprovement}
                  disabled={isImproving}
                  className="shrink-0 bg-[#E4E3E0] text-[#141414] hover:bg-white font-bold px-4 py-2.5 rounded-none border border-white text-xs font-mono uppercase flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 disabled:opacity-50"
                >
                  {isImproving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#141414]" />
                      <span>GENERATING...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 text-[#141414]" />
                      <span>GENERATE_MODEL_ANSWER</span>
                    </>
                  )}
                </button>
              </div>

              {/* Revision Output Box */}
              {showImprovementTab && improvedProposal && (
                <div className="bg-white/50 p-6 rounded-none border border-[#141414] shadow-none space-y-4">
                  <div className="flex items-center justify-between border-b border-[#141414]/15 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-red-600 fill-red-600 animate-pulse" />
                      <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414]">심사 지적 사항 반영 - 보완 완성본 (100점 만점 수준)</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyImproved}
                        className="p-1.5 text-xs font-bold font-mono uppercase tracking-wider text-[#141414] hover:bg-[#141414] hover:text-white border border-[#141414] rounded-none flex items-center gap-1.5 cursor-pointer transition-all duration-150"
                      >
                        {copySuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-red-600" />
                            <span className="text-red-600">COPY_SUCCESSFUL</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>COPY_DOCUMENT</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-none border border-[#141414] max-h-[400px] overflow-y-auto scrollbar-thin font-sans text-xs">
                    <MarkdownViewer content={improvedProposal} />
                  </div>
                  <p className="text-[10px] text-[#141414] opacity-80 text-center font-mono uppercase">
                    💡 위 수정 기획서는 원본의 아이디어를 훼손하지 않으면서 RAG 구조 보완, 라이선스 식별, 개인정보 파기 주기 명시, 긴급 대피 단계 수립 등을 완벽하게 구체화한 모범안입니다.
                  </p>
                </div>
              )}

              {/* Chief Evaluator 1:1 Live Q&A Coach Chat */}
              <div className="bg-white/50 rounded-none border border-[#141414] shadow-none overflow-hidden flex flex-col min-h-[400px]">
                {/* Chat Header */}
                <div className="bg-[#141414] text-[#E4E3E0] px-5 py-3.5 flex items-center justify-between border-b border-[#141414]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-red-600" /> AI 수석 심사위원과 실시간 1:1 보완 코칭 질의응답
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#E4E3E0] font-mono opacity-80 tracking-wider">
                    OFFICIAL COACHING CHANNEL
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto max-h-[300px] bg-white space-y-4 font-mono text-[11px] text-[#141414]">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${
                        msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1 text-[9px] opacity-75 font-bold uppercase">
                        <span>{msg.role === "user" ? "STUDENT_SUBJECT" : "CHIEF_JUDGE_OPINION"}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      
                      <div className={`p-3 rounded-none border leading-relaxed text-xs ${
                        msg.role === "user" 
                          ? "bg-[#141414] text-white border-[#141414]" 
                          : "bg-[#E4E3E0] text-[#141414] border-[#141414] font-medium"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex flex-col items-start mr-auto max-w-[85%] font-mono text-[10px]">
                      <div className="opacity-75 font-bold uppercase mb-1">
                        CHIEF_JUDGE COMPOSING...
                      </div>
                      <div className="bg-white border border-[#141414] p-3 rounded-none flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#141414] animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#141414] animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#141414] animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Form Input */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-[#141414] flex items-center gap-2.5 bg-[#E4E3E0]">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="피드백에 대한 추가 구체적 예시나 RAG 아키텍처 보강 가이드를 질문해 보십시오."
                    disabled={isChatting}
                    className="flex-1 p-2.5 rounded-none border border-[#141414] bg-white focus:outline-hidden text-xs font-sans disabled:opacity-75"
                  />
                  <button
                    type="submit"
                    disabled={isChatting || !currentMessage.trim()}
                    className="bg-[#141414] text-white hover:bg-[#2c2c2c] p-2.5 rounded-none border border-[#141414] transition-all duration-150 shrink-0 flex items-center justify-center disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-[#141414] text-[#E4E3E0] border-t border-[#141414] py-6 text-center text-[10px] font-mono uppercase tracking-wider">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p>© 2026 AI SERVICE PIPELINE PROTOCOL. All Rights Reserved.</p>
          <p className="flex items-center justify-center gap-1 opacity-80">
            <Lock className="w-3.5 h-3.5 text-red-600" /> Authorized Sandbox Platform for 25-10406@daegu-hwawon.hs.kr
          </p>
        </div>
      </footer>
    </div>
  );
}
