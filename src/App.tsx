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

  // Get color configurations based on score ranges aligned with modern B2B SaaS Standards
  const getScoreColorClass = (score: number) => {
    if (score >= 90) return {
      text: "text-slate-900",
      bg: "bg-emerald-50/50",
      border: "border-emerald-100",
      progress: "bg-emerald-500",
      gauge: "#10b981",
      grade: "우수 (Excellent)",
      gradeColor: "bg-emerald-50 text-emerald-700 border-emerald-100/80",
      badge: "text-emerald-700 bg-emerald-50 border-emerald-100"
    };
    if (score >= 70) return {
      text: "text-slate-900",
      bg: "bg-amber-50/50",
      border: "border-amber-100",
      progress: "bg-amber-500",
      gauge: "#f59e0b",
      grade: "보통 (Satisfactory)",
      gradeColor: "bg-amber-50 text-amber-700 border-amber-100/80",
      badge: "text-amber-700 bg-amber-50 border-amber-100"
    };
    return {
      text: "text-slate-900",
      bg: "bg-rose-50/50",
      border: "border-rose-100",
      progress: "bg-rose-500",
      gauge: "#f43f5e",
      grade: "재검토 필요 (Revision)",
      gradeColor: "bg-rose-50 text-rose-700 border-rose-100/80",
      badge: "text-rose-700 bg-rose-50 border-rose-100"
    };
  };

  const activeColor = result ? getScoreColorClass(result.score) : null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col font-sans selection:bg-indigo-100">
      {/* Top Banner / Header */}
      <header className="bg-slate-900 text-white px-6 py-4.5 sticky top-0 z-40 border-b border-slate-800/60 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-sm shadow-indigo-500/50"></div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                AI Senior Judge <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">Protocol v4.0</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                5대 핵심 심사 차원 기반의 정교한 AI 서비스 파이프라인 심사 및 실시간 맞춤형 코칭
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-800/60 p-1.5 rounded-lg text-xs border border-slate-700/50">
            <span className="px-2 py-0.5 bg-slate-950 text-indigo-400 font-mono font-semibold rounded-md">
              GEMINI 3.5 FLASH
            </span>
            <span className="px-1 text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold">RIGOROUS_MODE</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Student Proposal Input (lg:col-span-5) */}
        <div id="proposal-input-section" className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Sample Selector Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" /> EVALUATION TEMPLATES
              </h2>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                4 Samples Loaded
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {sampleProposals.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-2 cursor-pointer ${
                    activeSample === sample.id 
                      ? "border-indigo-600 bg-indigo-50/40 shadow-xs shadow-indigo-600/5" 
                      : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-slate-900 text-sm tracking-tight leading-tight">
                      {sample.title}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${
                      activeSample === sample.id 
                        ? "bg-indigo-100 text-indigo-800 border-indigo-200" 
                        : "bg-white text-slate-500 border-slate-200"
                    }`}>
                      {sample.tag}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs w-full mt-1 border-t border-slate-100/60 pt-2 text-slate-400">
                    <span className="font-medium">
                      작성자: {sample.author}
                    </span>
                    <span className={`font-semibold ${
                      activeSample === sample.id ? "text-indigo-600" : "text-amber-600"
                    }`}>
                      {sample.expectedScoreRange}
                    </span>
                  </div>
                </button>
              ))}

              <button
                onClick={() => handleSelectSample("custom")}
                className={`w-full p-4 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer text-sm font-semibold ${
                  activeSample === "custom" 
                    ? "border-indigo-600 bg-indigo-50/30 text-indigo-700" 
                    : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600"
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>기획서 직접 새로 작성하기</span>
              </button>
            </div>
          </div>

          {/* Proposal Editor Area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-xs flex-1 flex flex-col min-h-[500px] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  {activeSample === "custom" ? "기획서 자유 입력 및 편집란" : "선택된 기획서 원문 문서"}
                </h3>
              </div>
              <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full font-medium">
                {proposal.length} 자
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
                placeholder={`여기에 학생들이 작성한 'AI 서비스 파이프라인 기획서'를 자유롭게 입력하거나 붙여넣어 주세요.
                
[기획서 핵심 권장 항목]
1. 사용자 및 문제 정의 (Who, When, What, Why)
2. AI 서비스 파이프라인 구조 설계
3. 데이터 전략 및 신뢰성/RAG 검증 계획
4. 리스크 거버넌스 및 안전장치
5. 프로젝트 타당성 및 시연 시나리오

위 핵심 항목과 각 세부 요구 조건이 구체적일수록 감점을 우회하고 훌륭한 심사 결과를 얻을 수 있습니다.`}
                className="w-full flex-1 p-4.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:outline-hidden text-sm leading-relaxed bg-slate-50/30 text-slate-700 disabled:opacity-75 transition-all duration-200 min-h-[300px]"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setProposal("")}
                disabled={isEvaluating || !proposal}
                className="py-3 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all duration-150 disabled:opacity-50 cursor-pointer text-center"
              >
                비우기
              </button>
              
              <button
                onClick={handleStartEvaluation}
                disabled={isEvaluating || !proposal.trim()}
                className="col-span-2 py-3 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/15"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>심사 진단 알고리즘 실행 중...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>심사 시작하기</span>
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
            <div className="bg-white p-8 rounded-2xl border border-slate-200/50 shadow-xs flex flex-col items-center justify-center min-h-[550px] text-center gap-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-800">
                  기획서 심사 진단 프로토콜 실행 중
                </h3>
                <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                  AI 수석 심사위원단이 5대 핵심 심사 차원과 감점 세부 기준표에 입각하여 학생 제출물 내용을 정밀 검토 중입니다.
                </p>
              </div>
              
              <div className="bg-slate-900 text-slate-200 font-mono text-xs p-5 rounded-xl border border-slate-800 max-w-md w-full text-left shadow-lg">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reviewer Engine Log</span>
                </div>
                <div className="text-xs text-indigo-300 leading-relaxed font-sans">{evaluationStage}</div>
              </div>
            </div>
          )}

          {/* 2. Empty State (Before Evaluation) */}
          {!isEvaluating && !result && (
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/50 shadow-xs flex flex-col justify-between min-h-[550px] space-y-6">
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                  <Award className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-800">AI 수석 심사위원 5대 평가 모델 및 감점 기준 가이드</h3>
                </div>
                
                <p className="text-sm text-slate-500 leading-relaxed">
                  본 심사 시스템은 교육부 산하 평가 가이드라인과 실무 AI 설계 프로토콜에 의거한 5대 핵심 지표를 심사에 반영합니다. 각 항목별로 필수 요건이 결여되어 있는 경우 감점 매트릭스에 따른 세부 감점이 가차 없이 누적되니 유의하여 주십시오.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100/80 text-sm flex gap-3.5">
                    <div className="font-bold text-indigo-600 font-mono text-sm shrink-0">01</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs">사용자 및 문제 정의 (20점)</h4>
                      <p className="text-slate-500 leading-relaxed text-[11px]">문제 당사자(Who), 발생 상황(When/Where), 구체적 불편(What), 기대 변화(Why) 4대 요소의 유기적 연계성. (미흡 요소당 5점 감점)</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100/80 text-sm flex gap-3.5">
                    <div className="font-bold text-indigo-600 font-mono text-sm shrink-0">02</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs">AI 파이프라인 구조 설계 (25점)</h4>
                      <p className="text-slate-500 leading-relaxed text-[11px]">데이터 흐름이 [입력데이터 ➡️ 인식도구(모델/센서) ➡️ LLM 핵심 역할 ➡️ 최종 UI] 형태로 빈틈없이 구조화되었는지 진단. (핵심 연계 누락 시 10점 감점)</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100/80 text-sm flex gap-3.5">
                    <div className="font-bold text-indigo-600 font-mono text-sm shrink-0">03</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs">데이터 전략 및 RAG 검증 (25점)</h4>
                      <p className="text-slate-500 leading-relaxed text-[11px]">적법한 데이터 수집 출처 제시, 라벨링 기준, 그리고 LLM의 환각 현상(Hallucination) 방지를 위한 구체적 RAG 구조 및 프롬프트 검증 대책. (누락 시 최대 15점 감점)</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100/80 text-sm flex gap-3.5">
                    <div className="font-bold text-indigo-600 font-mono text-sm shrink-0">04</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-xs">리스크 거버넌스 및 안전장치 (20점)</h4>
                      <p className="text-slate-500 leading-relaxed text-[11px]">개인정보 라이프사이클 관리안(저장/기간/파기) 및 극단적 상황 혹은 유해한 입력 시 우회하고 경고를 보낼 단계별 안전장치 유무. (안전 프로토콜 미비 시 15점 감점)</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-slate-100/80 text-sm flex gap-3.5">
                  <div className="font-bold text-indigo-600 font-mono text-sm shrink-0">05</div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">타당성 및 시연 시나리오 (10점)</h4>
                    <p className="text-slate-500 leading-relaxed text-[11px]">이상 정상 시나리오 구성 여부, 통신 예외 조치 등 구체적인 시연 시나리오와 명확한 역할 분담 비중. (미흡 시 5점 감점)</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
                <span className="flex items-center gap-1.5"><Info className="w-4 h-4 text-slate-400 shrink-0" /> 왼쪽 기획서 템플릿을 선택하거나 직접 입력 후 '평가 시작' 버튼을 눌러주세요.</span>
                <span className="font-semibold tracking-wider text-slate-300 font-mono">SYSTEM VER 4.0.2</span>
              </div>
            </div>
          )}

          {/* 3. Evaluation Results Rendered */}
          {!isEvaluating && result && activeColor && (
            <div className="space-y-6">
              
              {/* Score & Stamp Header Card */}
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/50 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-radial from-indigo-500/5 to-transparent pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left Column: Grade & Status */}
                  <div className="space-y-3.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider bg-slate-900 text-slate-100 px-2.5 py-1 rounded-md">
                        EVAL_DECISION
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wide ${activeColor.gradeColor}`}>
                        {activeColor.grade}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      기획서 다차원 종합 심사 결과 보고서
                    </h2>
                    
                    <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                      본 결과는 제출된 AI 기획서를 5대 정량 지표와 세부 감점 매트릭스에 따라 아주 정밀하게 분석하여 평정된 최종 정량 리포트입니다.
                    </p>
                  </div>

                  {/* Right Column: Circular Score Gauge */}
                  <div className="flex flex-col items-center justify-center shrink-0 self-center md:self-auto md:pr-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      {/* SVG Gauge Circle */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="#E2E8F0"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke={activeColor.gauge}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={2 * Math.PI * 52 * (1 - result.score / 100)}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      {/* Absolute Center Score */}
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-extrabold text-slate-900 leading-none">
                          {result.score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">
                          SCORE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Comment Certificate-style Section */}
                <div className="mt-6 p-4.5 rounded-xl bg-slate-50/50 border border-slate-100 relative">
                  <div className="absolute right-4 bottom-4 opacity-[0.03] select-none pointer-events-none">
                    <Award className="w-20 h-20 text-slate-900" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-400 mb-1.5 tracking-wider uppercase font-mono">
                    CHIEF JUDGE SUMMARY OPINION
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    &ldquo;{result.overallComment}&rdquo;
                  </p>
                </div>
              </div>

              {/* 5 Dimensions Segment Breakdown Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-5">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <BrainCircuit className="w-4 h-4 text-indigo-500" /> METRIC SCORE BREAKDOWN
                </h3>

                <div className="space-y-4">
                  {/* D1 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-700 font-medium text-xs">
                      <span>[01] 사용자 및 문제 정의 (Who, When, What, Why)</span>
                      <span className="font-semibold text-slate-900">{result.scores.userProblem} / 20점</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${(result.scores.userProblem / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* D2 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-700 font-medium text-xs">
                      <span>[02] AI 서비스 파이프라인 구조 설계</span>
                      <span className="font-semibold text-slate-900">{result.scores.pipelineDesign} / 25점</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${(result.scores.pipelineDesign / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* D3 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-700 font-medium text-xs">
                      <span>[03] 데이터 전략 및 신뢰성/RAG 검증 계획</span>
                      <span className="font-semibold text-slate-900">{result.scores.dataStrategy} / 25점</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${(result.scores.dataStrategy / 25) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* D4 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-700 font-medium text-xs">
                      <span>[04] 리스크 거버넌스 및 안전장치</span>
                      <span className="font-semibold text-slate-900">{result.scores.riskGovernance} / 20점</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${(result.scores.riskGovernance / 20) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* D5 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-slate-700 font-medium text-xs">
                      <span>[05] 프로젝트 타당성 및 시연 시나리오</span>
                      <span className="font-semibold text-slate-900">{result.scores.feasibility} / 10점</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${(result.scores.feasibility / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 17대 세부 채점표 (17-Point Granular Checklist) */}
              {result.rubricChecklist && result.rubricChecklist.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" /> 17대 세부 루브릭 채점표 (Granular Checklist)
                    </h3>
                    <span className="text-[10px] bg-rose-50 text-rose-600 font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border border-rose-100">STRICT_MODE</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    대분류 영역별 평가 가이드 합격(Met) / 미달(Unmet) 판정 결과와 감점된 구체적 원인 및 보완 피드백 상세 내역입니다.
                  </p>

                  <div className="space-y-4 pt-1">
                    {[
                      { key: "userProblem", label: "01. 사용자 및 문제 정의", icon: Users },
                      { key: "pipelineDesign", label: "02. AI 서비스 파이프라인 구조 설계", icon: BrainCircuit },
                      { key: "dataStrategy", label: "03. 데이터 전략 및 RAG 검증 계획", icon: Database },
                      { key: "riskGovernance", label: "04. 리스크 거버넌스 및 안전장치", icon: ShieldAlert },
                      { key: "feasibility", label: "05. 프로젝트 타당성 및 시연 시나리오", icon: Award }
                    ].map((catGroup) => {
                      const items = result.rubricChecklist!.filter(item => item.category === catGroup.key);
                      const IconComponent = catGroup.icon;
                      if (items.length === 0) return null;
                      
                      return (
                        <div key={catGroup.key} className="border border-slate-100 bg-slate-50/50 rounded-xl p-4.5 space-y-3">
                          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                            <IconComponent className="w-4 h-4 text-indigo-500 shrink-0" />
                            <h4 className="text-xs font-bold text-slate-800">{catGroup.label}</h4>
                          </div>

                          <div className="divide-y divide-slate-100/70">
                            {items.map((item, itemIdx) => {
                              const badgeStyle = 
                                item.isMet === "Met" 
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-100/70" 
                                  : item.isMet === "Partial"
                                    ? "text-amber-700 bg-amber-50 border-amber-100/70"
                                    : "text-rose-700 bg-rose-50 border-rose-100/70";
                              
                              const indicatorText = 
                                item.isMet === "Met" 
                                  ? "충족 (Met)" 
                                  : item.isMet === "Partial"
                                    ? "일부 충족 (Partial)"
                                    : "미흡 (Unmet)";

                              return (
                                <div key={itemIdx} className="py-3 flex flex-col md:flex-row md:items-start justify-between gap-3 first:pt-0 last:pb-0">
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                                        {indicatorText}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800 leading-tight">
                                        {item.name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 pl-1 leading-relaxed">
                                      {item.comment}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0 md:pt-0.5">
                                    <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-100">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Strengths Column (Good points) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> KEY STRENGTHS
                  </h4>
                  <ul className="space-y-3">
                    {result.strengths.map((strength, sIdx) => (
                      <li key={sIdx} className="text-xs text-slate-600 flex gap-2.5 leading-relaxed">
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Deficiencies Column (Weak points) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <AlertTriangle className="w-4 h-4 text-rose-500" /> DETECTED DEFICIENCIES
                  </h4>
                  {result.deficiencies.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-bold">감점 및 미흡 지적 사항이 없습니다. 매우 우수한 품질의 기획서입니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {result.deficiencies.map((def, dIdx) => (
                        <div key={dIdx} className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                          <button
                            onClick={() => toggleDeficiency(dIdx)}
                            className="w-full text-left bg-slate-50 p-3 flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/50 transition-colors"
                          >
                            <span className="truncate leading-tight text-[11px] text-slate-800">{def.title}</span>
                            {expandedDeficiencies[dIdx] ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                          </button>
                          
                          {expandedDeficiencies[dIdx] && (
                            <div className="p-4 bg-white border-t border-slate-50 text-xs text-slate-600 leading-relaxed space-y-2.5">
                              <p className="font-bold text-[10px] tracking-wider text-rose-600 uppercase font-mono">🔍 DETAILED CRITIQUE & ACTIONABLE MITIGATION PLAN</p>
                              <p className="bg-slate-50 p-3.5 rounded-lg text-slate-600 leading-relaxed text-xs border-l-4 border-rose-500 font-sans">
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
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-radial from-indigo-500/10 to-transparent pointer-events-none"></div>
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold tracking-wider uppercase font-mono">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>RECOMMENDED REVISION GENERATOR</span>
                  </div>
                  <h4 className="text-base font-bold text-white tracking-tight">감점 요소를 완벽하게 보완한 모범 기획서 자동 생성</h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                    위에서 도출된 감점 분석 사항을 직접 반영하여, 심사 지적 요소들을 철저하게 구체화한 A+ 만점 수준의 수정 보완 기획서 전문을 생성합니다.
                  </p>
                </div>

                <button
                  onClick={handleGetImprovement}
                  disabled={isImproving}
                  className="shrink-0 bg-white text-slate-900 hover:bg-slate-100 font-bold px-5 py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50 relative z-10 shadow-md"
                >
                  {isImproving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                      <span>작성하는 중...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 text-slate-900" />
                      <span>모범 완성안 자동 생성</span>
                    </>
                  )}
                </button>
              </div>

              {/* Revision Output Box */}
              {showImprovementTab && improvedProposal && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4.5 h-4.5 text-indigo-500 fill-indigo-100 animate-pulse" />
                      <h3 className="text-sm font-bold text-slate-800">지적 사항이 보완된 모범 답안 기획서</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyImproved}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-all duration-150"
                      >
                        {copySuccess ? (
                          <>
                            <Check className="w-4 h-4 text-indigo-600" />
                            <span className="text-indigo-600">복사 완료!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>문서 복사</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 max-h-[400px] overflow-y-auto scrollbar-thin text-slate-700">
                    <MarkdownViewer content={improvedProposal} />
                  </div>
                  <p className="text-xs text-slate-400 text-center leading-relaxed">
                    💡 위 수정본은 오리지널 기획 의도를 고스란히 보존하면서, 5대 평가 지표(RAG 구조, 라이선스 식별, 개인정보 파기 주기 명시, 긴급 대피 절차)를 완벽하게 보강한 기획서입니다.
                  </p>
                </div>
              )}

              {/* Chief Evaluator 1:1 Live Q&A Coach Chat */}
              <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
                {/* Chat Header */}
                <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-400" /> 수석 심사위원과의 실시간 1:1 보완 코칭 질의응답
                    </h3>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono tracking-wider font-bold">
                    OFFICIAL COACHING
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-5 overflow-y-auto max-h-[350px] bg-slate-50/50 space-y-4">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${
                        msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1 text-[10px] text-slate-400 font-medium">
                        <span>{msg.role === "user" ? "제출 학생" : "수석 심사위원 피드백"}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      
                      <div className={`p-3.5 rounded-2xl leading-relaxed text-sm ${
                        msg.role === "user" 
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-sm shadow-indigo-600/10" 
                          : "bg-white text-slate-700 rounded-tl-none border border-slate-200/60 shadow-xs"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex flex-col items-start mr-auto max-w-[85%]">
                      <div className="text-[10px] text-slate-400 font-medium mb-1">
                        심사위원이 상세 가이드 답변을 작성하고 있습니다...
                      </div>
                      <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Form Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white">
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="피드백에 대해 아키텍처나 추가적인 대책 수립 방향 등 궁금한 세부 질문을 남겨주세요."
                    disabled={isChatting}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-sm disabled:opacity-75 transition-all duration-150"
                  />
                  <button
                    type="submit"
                    disabled={isChatting || !currentMessage.trim()}
                    className="bg-indigo-600 text-white hover:bg-indigo-700 p-3 rounded-xl transition-all duration-150 shrink-0 flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-sm shadow-indigo-600/15"
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
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800/80 py-6 text-center text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p>© 2026 AI SERVICE PIPELINE PROTOCOL. All Rights Reserved.</p>
          <p className="flex items-center justify-center gap-1.5 opacity-80 text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-600" /> Authorized Sandbox Platform for 25-10406@daegu-hwawon.hs.kr
          </p>
        </div>
      </footer>
    </div>
  );
}

