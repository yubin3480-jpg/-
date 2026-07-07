import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Send, 
  Clipboard, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Eye, 
  EyeOff,
  ExternalLink,
  Mail, 
  Phone, 
  MessageSquare, 
  History, 
  Plus, 
  Trash2,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  FileText,
  BookOpen,
  Award,
  ShieldAlert,
  UserCheck,
  Smartphone,
  Zap,
  TrendingUp,
  ThumbsUp,
  ChevronRight,
  Info,
  Lock,
  Shield
} from "lucide-react";
import Markdown from "react-markdown";
import { CSInput, CSResult, HistoryItem, CSDraft } from "./types";

const CATEGORY_PRESETS = [
  "기기 고장 및 수리 지연",
  "정산 및 수수료 문의",
  "발주 및 배송 오류",
  "불친절 및 서비스 민원",
  "계약 변경 및 위약금 문의",
  "기타 직접 입력"
];

const EXAMPLES = [
  {
    title: "기기 고장 (감정대응 필요)",
    category: "기기 고장 및 수리 지연",
    summary: "커피 머신이 갑자기 작동하지 않아 수리를 요청했으나 A/S가 3일째 지연되어 점주 불만이 가중된 상황",
    request: "대체 기기를 즉시 설치해 주거나 3일간의 커피 매출 발생분 손실을 전액 보상하라고 요구함",
    specialNotes: "단골 컴플레인이 밀려 점주님이 극심한 스트레스를 호소하고 있으며, 본사와의 계약 해지까지 언급함",
    preferredFormat: "전화 스크립트"
  },
  {
    title: "정산/수수료 (사실확인 중심)",
    category: "정산 및 수수료 문의",
    summary: "가맹점주가 이번 달 정산 명세서를 확인하고 지난달 대비 총 정산액이 15% 가량 적게 입금되었다고 이의 제기",
    request: "금액 차이가 발생한 구체적인 세부 항목 설명과 함께 즉각적인 재정산 및 차액 입금을 강력히 요구함",
    specialNotes: "차분하고 논리적인 점주님이지만 납득 가능한 증빙 데이터가 누락되면 반복적으로 정산 의혹을 제기할 우려가 있음",
    preferredFormat: "이메일"
  },
  {
    title: "발주 변경 (단순 공지/확인)",
    category: "발주 및 배송 오류",
    summary: "폭우로 인해 다음 날 배송 예정이었던 신선 상품(삼각김밥, 샌드위치 등)의 배송 시간이 2시간 지연될 예정",
    request: "배송 지연에 대한 사전 안내 공지 및 미납 방지 대책 설명 요청",
    specialNotes: "바쁜 오전 피크타임 판매에 지장이 생겨 예민할 수 있으므로 신속하고 간결한 알림이 필요함",
    preferredFormat: "문자/카톡"
  }
];

export default function App() {
  const [viewMode, setViewMode] = useState<"workspace" | "landing">("workspace");
  const [input, setInput] = useState<CSInput>({
    category: "",
    summary: "",
    request: "",
    specialNotes: "",
    preferredFormat: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CSResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedDraftIndex, setCopiedDraftIndex] = useState<number | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  
  // Interactive Placeholder Filler state
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"interactive" | "markdown">("interactive");

  // Clarification Input when ambiguous
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>([]);

  // Simulation state for landing interactive comparison
  const [activeSimId, setActiveSimId] = useState<number>(0);

  // Gemini API Key state management
  const [userApiKey, setUserApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState("");
  const [isKeyValidating, setIsKeyValidating] = useState(false);
  const [keyValidationMsg, setKeyValidationMsg] = useState<{ status: "success" | "error" | null, text: string }>({ status: null, text: "" });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Load API key from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("user_gemini_api_key") || "";
    setSavedApiKey(saved);
    setUserApiKey(saved);
  }, []);

  // Save key
  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    localStorage.setItem("user_gemini_api_key", trimmed);
    setSavedApiKey(trimmed);
    setUserApiKey(trimmed);
    setKeyValidationMsg({ status: "success", text: "성공적으로 저장되었습니다." });
  };

  // Delete key
  const deleteApiKey = () => {
    localStorage.removeItem("user_gemini_api_key");
    setSavedApiKey("");
    setUserApiKey("");
    setKeyValidationMsg({ status: null, text: "" });
  };

  // Validate the API key with the backend
  const validateApiKey = async (keyToValidate: string) => {
    const trimmed = keyToValidate.trim();
    if (!trimmed) {
      setKeyValidationMsg({ status: "error", text: "API Key를 입력해 주세요." });
      return;
    }
    setIsKeyValidating(true);
    setKeyValidationMsg({ status: null, text: "" });

    try {
      const res = await fetch("/api/cs/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("user_gemini_api_key", trimmed);
        setSavedApiKey(trimmed);
        setUserApiKey(trimmed);
        setKeyValidationMsg({ status: "success", text: data.message || "API Key가 정상적으로 승인 및 저장되었습니다." });
      } else {
        setKeyValidationMsg({ status: "error", text: data.error || "유효하지 않은 API Key이거나 네트워크 인증 오류입니다." });
      }
    } catch (e: any) {
      setKeyValidationMsg({ status: "error", text: e.message || "인증 처리 도중 예외가 발생했습니다." });
    } finally {
      setIsKeyValidating(false);
    }
  };

  const navigateToApiKeySection = () => {
    setViewMode("landing");
    setTimeout(() => {
      const element = document.getElementById("api-key-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        const inputElement = element.querySelector("input");
        if (inputElement) {
          inputElement.focus();
        }
      }
    }, 120);
  };

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cs_helper_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to local storage
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("cs_helper_history", JSON.stringify(newHistory));
  };

  // Extract placeholders like [담당자 이름] or [월] from drafts
  useEffect(() => {
    if (!result || !result.drafts) return;
    
    const found: string[] = [];
    const regex = /\[(.*?)\]/g;
    
    result.drafts.forEach(draft => {
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(draft.content)) !== null) {
        if (match[1] && !found.includes(match[1])) {
          found.push(match[1]);
        }
      }
      
      if (draft.title) {
        regex.lastIndex = 0;
        while ((match = regex.exec(draft.title)) !== null) {
          if (match[1] && !found.includes(match[1])) {
            found.push(match[1]);
          }
        }
      }
    });

    const newPlaceholders: Record<string, string> = {};
    found.forEach(name => {
      newPlaceholders[name] = placeholders[name] || "";
    });
    setPlaceholders(newPlaceholders);
  }, [result]);

  const handleInputChange = (field: keyof CSInput, value: string) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: typeof EXAMPLES[0]) => {
    setInput({
      category: preset.category,
      summary: preset.summary,
      request: preset.request,
      specialNotes: preset.specialNotes,
      preferredFormat: preset.preferredFormat
    });
    setClarificationAnswers([]);
    setViewMode("workspace"); // Switch to workspace directly when clicking template
  };

  const generateResponse = async (appendClarification = false) => {
    if (!input.category && !input.summary && !input.request) {
      alert("최소한 하나의 입력 필드는 채워주세요.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    let finalSummary = input.summary;
    if (appendClarification && clarificationAnswers.length > 0 && result?.clarificationQuestions) {
      finalSummary += "\n\n[추가 확인 사항 답변]\n" + result.clarificationQuestions.map((q, i) => `Q: ${q}\nA: ${clarificationAnswers[i] || "미답변"}`).join("\n");
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      const storedKey = localStorage.getItem("user_gemini_api_key");
      if (storedKey) {
        headers["x-gemini-api-key"] = storedKey.trim();
      }

      const response = await fetch("/api/cs/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          category: input.category,
          summary: finalSummary,
          request: input.request,
          specialNotes: input.specialNotes,
          preferredFormat: input.preferredFormat
        })
      });

      if (!response.ok) {
        throw new Error("서버 응답 오류가 발생했습니다.");
      }

      const data: CSResult = await response.json();
      setResult(data);
      
      if (!data.isInputAmbiguous) {
        setClarificationAnswers([]);
        
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString("ko-KR"),
          input: { ...input, summary: finalSummary },
          result: data
        };
        const updatedHistory = [newItem, ...history].slice(0, 30);
        saveHistory(updatedHistory);
      } else {
        setClarificationAnswers(new Array(data.clarificationQuestions?.length || 0).fill(""));
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || "응대 초안을 생성하는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    saveHistory(updated);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInput(item.input);
    setResult(item.result);
    setClarificationAnswers([]);
    setViewMode("workspace");
  };

  const getReplacedText = (text: string) => {
    let output = text;
    Object.entries(placeholders).forEach(([name, val]) => {
      const replacement = val ? val : `[${name}]`;
      const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\[${escapedName}\\]`, "g");
      output = output.replace(regex, replacement);
    });
    return output;
  };

  const copyToClipboard = (text: string, index: number, isMarkdown = false) => {
    navigator.clipboard.writeText(text);
    if (isMarkdown) {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } else {
      setCopiedDraftIndex(index);
      setTimeout(() => setCopiedDraftIndex(null), 2000);
    }
  };

  const clearForm = () => {
    setInput({
      category: "",
      summary: "",
      request: "",
      specialNotes: "",
      preferredFormat: ""
    });
    setResult(null);
    setClarificationAnswers([]);
    setPlaceholders({});
  };

  const simulatedConversations = [
    {
      scenario: "장비 수리 지연 클레임",
      bad: {
        text: "점장님, 수리 기사는 모레 방문 예정입니다. 본사 규정상 대체 기기 지원이나 소급 보상은 어렵습니다. 협조 부탁드립니다.",
        reaction: "점주 분노 폭발: '내가 지금 장난하는 줄 알아? 본사는 규정 타령만 하고 당장 계약 해지하고 SNS에 글 올린다!'"
      },
      good: {
        text: "점장님, 기기 고장으로 오전 피크 시간 매출 및 단골분들 이탈에 대해 얼마나 마음 졸이셨을지 너무나 공감합니다. 말씀해주신 단골 고객 지장 문제를 해결하는 것이 최우선이므로, 본사 보유 예비 기기를 내일 오전까지 매장에 임시 공수해 설치하도록 조치하겠습니다.",
        reaction: "점주 진정 & 감동: '그래요, 본사에서 내 상황을 이해해 주니 다행이네요. 내일 오전까지는 참아볼게요.'"
      }
    },
    {
      scenario: "정산 차액 이의 제기",
      bad: {
        text: "정산 금액은 수수료율 및 공제 규정에 맞게 처리되었습니다. 명세서를 다시 꼼꼼히 확인해 보시기 바랍니다.",
        reaction: "점주 신뢰 상실: '내가 바보인 줄 아나? 수수료 계산이 작년이랑 다르게 누락된 거 같은데 왜 무책임하게 답해?'"
      },
      good: {
        text: "점장님, 이번 달 총 정산액 15% 하락으로 예산 운영에 큰 혼선과 불안감을 드려 송구합니다. 확인 결과 이번 사안은 [공제 항목 명세]에 차액 원인이 기재되어 있어, 이 세부 수치 데이터와 지난달 대비 요율 조견표를 명확히 메일로 전달드리겠습니다. 한 치의 오차가 없도록 재검증하겠습니다.",
        reaction: "점주 납득: '아, 데이터로 투명하게 뽑아서 보여주니 오해가 확실히 풀렸어요. 고맙습니다.'"
      }
    }
  ];

  return (
    <div id="app-root" className="flex flex-col h-screen w-full bg-[#fafbfc] font-sans text-slate-900 overflow-hidden">
      
      {/* Premium Sleek Header in Tirtus Style */}
      <header id="app-header" className="flex items-center justify-between px-6 sm:px-10 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/60 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm tracking-widest shadow-md shadow-blue-500/20">
            CS
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-2 font-display">
              가맹점 CS 어시스턴트 <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Store Partner Helper</span>
            </h1>
          </div>
        </div>

        {/* Tab Selection for Landing vs Workspace in Tirtus Pill Style */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={() => setViewMode("workspace")}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer ${
              viewMode === "workspace"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            워크스페이스
          </button>
          <button
            onClick={() => setViewMode("landing")}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "landing"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>서비스 소개 및 강점</span>
          </button>
          
          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* API Key Status Indicator / Button */}
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full transition cursor-pointer border ${
              savedApiKey
                ? "text-emerald-700 bg-emerald-50 border-emerald-200/80 hover:bg-emerald-100"
                : "text-amber-700 bg-amber-50 border-amber-200/80 hover:bg-amber-100"
            }`}
            title="Gemini API Key 설정을 편집합니다."
          >
            {savedApiKey ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>API Key 활성</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>API Key 미등록</span>
              </>
            )}
          </button>

          <button
            onClick={clearForm}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer"
            title="모든 입력을 초기화합니다."
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden md:inline">초기화</span>
          </button>
        </div>
      </header>

      {/* FULL LANDING PAGE VIEW */}
      {viewMode === "landing" && (
        <div className="flex-1 overflow-y-auto bg-[#fafbfc]">
          
          {/* Hero Section with Cosmic Deep Indigo Gradient */}
          <section className="relative overflow-hidden bg-gradient-to-br from-[#060b24] via-[#0d163d] to-[#04081c] py-24 px-6 md:px-12 border-b border-slate-900 text-white">
            
            {/* Visual background glowing highlights matching Tirtus */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
            
            {/* Elegant glassmorphic glowing circle matching the white sphere in the image */}
            <div className="absolute right-[10%] top-1/4 w-32 h-32 rounded-full bg-white/5 border border-white/10 shadow-inner shadow-white/5 backdrop-blur-sm pointer-events-none hidden lg:block">
              <div className="absolute right-6 top-6 w-3.5 h-3.5 rounded-full bg-white/40 blur-xs"></div>
            </div>

            <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8 font-sans">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 text-[11px] font-bold tracking-widest text-blue-300 bg-white/5 rounded-full border border-white/10 backdrop-blur-md mb-2 uppercase font-display">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>가맹 영업관리의 새로운 패러다임</span>
              </div>
              
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-tight text-white leading-tight max-w-4xl mx-auto font-display">
                가맹점주와 거래처의 표면적 분노 이면,<br />
                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-200 to-white">숨겨진 진짜 니즈(Hidden Needs)</span>를 해결합니다.
              </h2>
              
              {/* Splitted/editorial colored paragraph style from image */}
              <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
                가맹점 CS 어시스턴트는 <span className="text-white font-medium">단순한 민원 응대 작성을 넘어섭니다.</span> 매출 타격, 고객 손실, 본사와의 두터운 신뢰 손상 등 가맹점의 <span className="text-blue-300 font-medium">실질적 우려를 분석하여,</span> 감정을 안정시키고 실무적인 합의를 이끌어냅니다.
              </p>
              
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setViewMode("workspace")}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2.5 text-xs tracking-wider uppercase font-display"
                >
                  <span>지금 바로 솔루션 체험하기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-xs text-slate-400 font-medium tracking-tight bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  실무 템플릿 즉시 매칭 & 리스크 배지 탑재
                </div>
              </div>
            </div>
          </section>

          {/* Overlapping Rounded Panel representing "For crafting bold digital realities" layout */}
          <section className="relative z-20 -mt-10 bg-white rounded-t-[40px] shadow-2xl border-t border-slate-100 pt-20 pb-16">
            <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-16">
              
              {/* Editorial split layout matching image */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-8 border-b border-slate-100">
                <div className="lg:col-span-5">
                  <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight font-display">
                    가맹점 CS 어시스턴트만의<br />
                    4대 핵심 강점
                  </h3>
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <span className="inline-block text-xs font-bold tracking-widest text-blue-600 uppercase">WHY US</span>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
                    가맹 점주와 본사 간의 긴밀한 상생 협력과 리스크 안전성 극대화를 위해 설계된 차세대 영업관리 특화 지능형 프로토콜을 탑재했습니다.
                  </p>
                </div>
              </div>

              {/* Strengths Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Strength 1 */}
                <div className="bg-[#f8f9fc] border border-slate-200/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-base sm:text-lg font-display">🧠 파트너 정서 케어 및 숨겨진 니즈 분석</h4>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        단순히 표면적인 기기 보상 요구를 그대로 거절하거나 기계적으로 답하는 대신, 점주가 겪는 '손님 이탈 걱정', '피크타임 매출 영향' 등을 캐치하여 마음의 온도를 낮춥니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Strength 2 */}
                <div className="bg-[#f8f9fc] border border-slate-200/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-base sm:text-lg font-display">🛡️ 3단계 지능형 리스크 안전장치</h4>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        금액·위약금 및 손해배상 조항 언급, SNS 및 언론사 노출 우려 등 리스크 상황을 AI가 실시간 자동 판정하여 상급자/법무팀 승인이 필요한 건에 경고 배지를 선제 부착합니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Strength 3 */}
                <div className="bg-[#f8f9fc] border border-slate-200/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-base sm:text-lg font-display">📡 상황 최적화 미디어 매칭</h4>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        즉각적인 감정 소통이 필요한 사안은 전화 스크립트, 수치나 증빙 등 영구적 기록이 필요한 경우는 공식 이메일, 신속 지연 상황은 모바일 알림톡으로 매체를 자동 맞춤 편성합니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Strength 4 */}
                <div className="bg-[#f8f9fc] border border-slate-200/50 rounded-3xl p-8 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-slate-900 text-base sm:text-lg font-display">✍️ 실시간 괄호 [ ] 플레이스홀더 편집기</h4>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                        초안에서 가맹점명, 수리 일시, 담당자 이름, 배송 예정일 등 미정 데이터를 실시간 폼에 타이핑하면 완성본에 바로 녹아들어 완벽한 사본을 즉시 복사하여 전송할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Majestic dark space metrics section matching "Every project is a fusion..." */}
          <section className="bg-gradient-to-br from-[#060b24] via-[#0d163d] to-[#04081c] text-white py-24 px-6 md:px-12 relative overflow-hidden">
            
            {/* Visual background cosmic line effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
            
            <div className="max-w-6xl mx-auto relative z-10">
              
              {/* Section Header */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pb-16 border-b border-white/10">
                <div className="lg:col-span-6 space-y-3">
                  <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">REAL COMPARISON</span>
                  <h3 className="text-3xl md:text-4xl font-extralight tracking-tight text-white leading-tight font-display">
                    본사 대응 한마디에 갈리는<br />
                    <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-white">점주 신뢰와 타협점</span>
                  </h3>
                </div>
                <div className="lg:col-span-6">
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    아래 탭을 눌러 가맹점 어시스턴트의 탁월한 감정 조율 차이를 실시간으로 비교해 보세요.
                  </p>
                </div>
              </div>

              {/* Premium Simulator Section */}
              <div className="mt-12 space-y-10">
                
                {/* Simulator Tabs */}
                <div className="flex flex-wrap justify-center gap-2.5">
                  {simulatedConversations.map((conv, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSimId(idx)}
                      className={`px-5 py-2.5 text-xs font-bold rounded-full transition-all cursor-pointer border ${
                        activeSimId === idx
                          ? "bg-white text-slate-900 border-white shadow-lg"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      시나리오 {idx + 1}: {conv.scenario}
                    </button>
                  ))}
                </div>

                {/* Display Comparison Cards with dark/light contrasts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Bad Example */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        일반 기계적인 답변 (Before)
                      </div>
                      <div className="bg-black/20 rounded-2xl p-5 border border-white/5 text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                        {simulatedConversations[activeSimId].bad.text}
                      </div>
                    </div>
                    <div className="mt-6 pt-5 border-t border-white/10 text-xs font-semibold text-rose-300 bg-rose-950/20 px-4 py-3 rounded-2xl leading-relaxed">
                      {simulatedConversations[activeSimId].bad.reaction}
                    </div>
                  </div>

                  {/* Good Example */}
                  <div className="bg-gradient-to-br from-blue-950/50 to-indigo-950/50 border border-blue-500/30 rounded-3xl p-8 flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                        어시스턴트 맞춤 정서 케어 (After)
                      </div>
                      <div className="bg-blue-900/10 rounded-2xl p-5 border border-blue-500/20 text-xs sm:text-sm text-white leading-relaxed italic font-medium">
                        "{simulatedConversations[activeSimId].good.text}"
                      </div>
                    </div>
                    <div className="mt-6 pt-5 border-t border-white/10 text-xs font-semibold text-blue-200 bg-blue-950/50 px-4 py-3 rounded-2xl leading-relaxed">
                      {simulatedConversations[activeSimId].good.reaction}
                    </div>
                  </div>

                </div>

                {/* High-end statistics layout from Tirtus image */}
                <div className="pt-20 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  <div className="space-y-3 border-t border-white/10 pt-6">
                    <span className="text-4xl sm:text-5xl lg:text-6xl font-light font-display">200+</span>
                    <div className="flex items-center justify-between text-slate-400 text-xs tracking-wider">
                      <span>누적 케어 케이스</span>
                      <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center">
                        <ArrowRight className="w-3.5 h-3.5 text-white/60" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-white/10 pt-6">
                    <span className="text-4xl sm:text-5xl lg:text-6xl font-light font-display">97%</span>
                    <div className="flex items-center justify-between text-slate-400 text-xs tracking-wider">
                      <span>고객 신뢰 회복율</span>
                      <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center">
                        <ArrowRight className="w-3.5 h-3.5 text-white/60" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-white/10 pt-6">
                    <span className="text-4xl sm:text-5xl lg:text-6xl font-light font-display">10X</span>
                    <div className="flex items-center justify-between text-slate-400 text-xs tracking-wider">
                      <span>실무 업무 효율 개선</span>
                      <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center">
                        <ArrowRight className="w-3.5 h-3.5 text-white/60" />
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </section>

          {/* Editorial Testimonial Grid corresponding to "2025 awards" */}
          <section className="max-w-6xl mx-auto px-6 md:px-12 py-24 space-y-16">
            
            {/* Split title layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5">
                <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">USER VOICE</span>
                <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight mt-2 font-display">
                  현직 프랜차이즈<br />
                  영업관리자(SV)들의 한마디
                </h3>
              </div>
              <div className="lg:col-span-7">
                <p className="text-sm text-slate-500 leading-relaxed">
                  현장에서 가맹점과 소통하는 수많은 파트너들이 가맹점 CS 어시스턴트로 업무 능률을 비약적으로 개선했습니다.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="bg-white border border-slate-200/60 p-8 rounded-3xl shadow-sm space-y-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-1 text-amber-400 text-sm">★★★★★</div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic font-light">
                  "매달 정산 수수료 클레임이 올 때마다 증명하기 난감하고 화내는 점주님들 전화가 지옥 같았는데, 이 툴로 감정을 선제 공감해 주는 스크립트를 받은 후 신뢰 관계 유지가 훨씬 쉬워졌습니다."
                </p>
                <div className="pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400 tracking-wider">
                  — 편의점 대기업 영업관리자 김성호 대리
                </div>
              </div>

              <div className="bg-white border border-slate-200/60 p-8 rounded-3xl shadow-sm space-y-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-1 text-amber-400 text-sm">★★★★★</div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic font-light">
                  "리스크 감지 덕분에 점주가 위약금이나 보상 고소를 걸어올 만한 상황을 상급자에게 빠르게 보고해 큰 이슈를 미연에 방지할 수 있었습니다. 최고의 영업관리 방패막이 도구입니다!"
                </p>
                <div className="pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400 tracking-wider">
                  — 요식업 프랜차이즈 SV 최지우 팀장
                </div>
              </div>

            </div>
          </section>

          {/* Gemini API Key Section in style of Tirtus cosmic fusion */}
          <section id="api-key-section" className="bg-gradient-to-br from-[#060b24] via-[#0b1236] to-[#04081c] text-white py-20 px-6 md:px-12 relative overflow-hidden border-t border-slate-900">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="max-w-4xl mx-auto space-y-10 relative z-10">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold tracking-widest text-blue-300 bg-white/5 rounded-full border border-white/10 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Gemini API Key 지능형 승인 연동</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                  개인 API Key 등록으로 한계 없는 초안 생성
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
                  가맹점 CS 어시스턴트는 최고 지능의 구글 Gemini AI 모델을 탑재하고 있습니다. 개인 API Key를 등록하시면 실시간 안전 진단을 거쳐 활성화되며, 본인 계정의 할당량을 활용해 일체의 횟수 제한 없이 자유롭게 서비스를 소유하고 이용하실 수 있습니다.
                </p>
              </div>

              {/* Glassmorphic configuration card */}
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 sm:p-10 backdrop-blur-md shadow-2xl space-y-6 max-w-2xl mx-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 font-display">
                      <span>🔑 API Key 등록 상태:</span>
                      {savedApiKey ? (
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          ● 승인 및 연동 활성화 완료
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                          ● 미지정 (시스템 기본값 사용)
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-light">
                      등록하신 API Key는 브라우저의 로컬 보안 저장소(localStorage)에만 안전하게 보관되며, 매 요청 시 암호화 프록시를 통해 서버 사이드에서 안전하게 실행됩니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={userApiKey}
                      onChange={(e) => {
                        setUserApiKey(e.target.value);
                        setKeyValidationMsg({ status: null, text: "" });
                      }}
                      placeholder="AIzaSy..."
                      className="w-full pl-4 pr-12 py-3.5 bg-black/30 border border-white/15 focus:border-blue-500 rounded-2xl text-xs sm:text-sm text-white font-mono placeholder-slate-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {keyValidationMsg.text && (
                    <div className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                      keyValidationMsg.status === "success"
                        ? "bg-emerald-950/20 text-emerald-300 border border-emerald-500/20"
                        : "bg-rose-950/20 text-rose-300 border border-rose-50/10"
                    }`}>
                      {keyValidationMsg.status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>{keyValidationMsg.text}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
                    <button
                      onClick={() => validateApiKey(userApiKey)}
                      disabled={isKeyValidating}
                      className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-full text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/10 hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isKeyValidating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>연동 및 승인 검증 중...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>실시간 인증 및 저장</span>
                        </>
                      )}
                    </button>
                    {savedApiKey && (
                      <button
                        onClick={deleteApiKey}
                        className="py-3.5 px-6 bg-white/5 hover:bg-white/10 text-rose-400 font-bold rounded-full text-xs uppercase tracking-wider transition-all border border-white/10 hover:border-rose-500/30 cursor-pointer"
                      >
                        인증 해제
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    구글 Gemini API Key가 없으신가요?
                  </span>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-400 transition font-bold flex items-center gap-1 underline decoration-blue-500/30 underline-offset-4"
                  >
                    <span>Google AI Studio에서 무료 발급받기</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Premium CTA Block */}
          <section className="bg-white py-16 text-center border-t border-slate-100">
            <div className="max-w-4xl mx-auto px-6 space-y-6">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                준비가 완료되셨나요?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
                이제 검증된 가맹 영업관리 지능형 CS 어시스턴트를 활용하여, 점주의 감정을 정렬하고 압도적인 속도로 상생 협의점을 찾아보세요.
              </p>
              <button
                onClick={() => {
                  if (!savedApiKey) {
                    navigateToApiKeySection();
                  } else {
                    setViewMode("workspace");
                  }
                }}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-full shadow-xl shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-xs tracking-wider uppercase font-display"
              >
                가맹점 CS 어시스턴트 시작하기
              </button>
            </div>
          </section>
        </div>
      )}

      {/* WORKSPACE & UTILITY VIEW */}
      {viewMode === "workspace" && (
        !savedApiKey ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f4f6fa] p-6 text-center animate-fade-in">
            <div className="max-w-xl bg-white border border-slate-200/60 rounded-[32px] shadow-2xl p-8 sm:p-12 relative overflow-hidden space-y-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

              {/* Locked Icon graphic */}
              <div className="relative mx-auto w-20 h-20 bg-gradient-to-tr from-rose-500 to-amber-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Lock className="w-10 h-10" />
                <div className="absolute -bottom-1 -right-1 bg-white text-slate-900 rounded-full p-1 border border-slate-100 shadow-sm flex items-center justify-center">
                  <Shield className="w-4 h-4 text-rose-500 fill-rose-50" />
                </div>
              </div>

              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-extrabold tracking-widest text-rose-600 bg-rose-50 rounded-full border border-rose-100 uppercase font-display">
                  <span>🚨 접근 제한됨 (ACCESS RESTRICTED)</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-display">
                  Gemini API Key 승인이 필요합니다
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed font-light">
                  본 서비스는 가맹 영업관리의 초정밀 정서 케어를 위해 구글 최상위 인공지능 <span className="font-semibold text-slate-800">Gemini-3.5-Flash</span> 모델을 직접 호출합니다. 모든 기능을 사용하시려면 API Key를 연동하고 최초 1회 실시간 승인을 받으셔야 합니다.
                </p>
              </div>

              {/* Core features listing (what they are missing out on) */}
              <div className="bg-[#f8f9fc] border border-slate-200/60 rounded-2xl p-5 space-y-3.5 text-left max-w-md mx-auto">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-display">
                  🔒 승인 즉시 활성화되는 지능형 도구들:
                </h4>
                <div className="space-y-2.5 text-xs text-slate-500">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                    <span><strong className="text-slate-700">무제한 초안 생성:</strong> 전화 스크립트, 공식 이메일, 알림톡 템플릿의 무제한 발급</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                    <span><strong className="text-slate-700">정밀 정서 검화:</strong> 점주의 대외 유포 위약금 언급 등 리스크 실시간 신호 파악</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                    <span><strong className="text-slate-700">공간 치환 에디터:</strong> 대괄호 공란 속성값을 즉시 폼으로 입력 및 치환하는 완성 도구</span>
                  </div>
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex flex-col sm:flex-row gap-3.5 pt-2 max-w-md mx-auto justify-center">
                <button
                  onClick={navigateToApiKeySection}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-full text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>실시간 API Key 승인 페이지로 이동</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <main className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          
          {/* Left Side: Input Panel */}
          <section id="input-panel" className="w-full lg:w-[420px] bg-white lg:border-r border-slate-200/60 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto shrink-0">
            
            {/* Quick Preset Seeding */}
            <div className="border border-slate-200/60 rounded-2xl p-5 bg-[#f8f9fc]">
              <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-display">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                신속 시드 테스트 (간편 템플릿)
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {EXAMPLES.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyPreset(ex)}
                    className="w-full text-left p-3 bg-white hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-500/30 rounded-xl transition text-xs group cursor-pointer shadow-xs"
                  >
                    <p className="font-extrabold text-slate-800 group-hover:text-blue-600 flex items-center justify-between">
                      <span>{ex.title}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition" />
                    </p>
                    <p className="text-slate-400 truncate mt-1 text-[10px]">{ex.category}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Content */}
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 font-display">
                  문의/클레임 유형 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={input.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition text-xs sm:text-sm text-slate-800 cursor-pointer"
                >
                  <option value="">-- 유형을 선택해 주세요 --</option>
                  {CATEGORY_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>{preset}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 font-display">
                  상황 요약 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={input.summary}
                  onChange={(e) => handleInputChange("summary", e.target.value)}
                  placeholder="발생한 사태의 경위와 문제 정황을 상세히 적어주세요."
                  rows={4}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none resize-none text-xs sm:text-sm text-slate-800 transition placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 font-display">
                  점주/거래처 요청사항 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={input.request}
                  onChange={(e) => handleInputChange("request", e.target.value)}
                  placeholder="예: 대체 기기 즉시 대여 및 매출 손실분 현금 보상"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-xs sm:text-sm text-slate-800 transition placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 font-display">
                  가맹점주 특이사항 <span className="text-slate-400 font-normal ml-1">(선택)</span>
                </label>
                <input
                  type="text"
                  value={input.specialNotes}
                  onChange={(e) => handleInputChange("specialNotes", e.target.value)}
                  placeholder="예: 반복적인 기기 고장으로 화가 극에 달한 상태"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none text-xs sm:text-sm text-slate-800 transition placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 font-display">
                  원하는 응대 형식 <span className="text-slate-400 font-normal ml-1">(선택)</span>
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "", label: "자동" },
                    { value: "전화 스크립트", label: "전화" },
                    { value: "문자/카톡", label: "문자" },
                    { value: "이메일", label: "이메일" }
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleInputChange("preferredFormat", item.value)}
                      className={`flex-1 py-2.5 px-3 border rounded-xl text-xs font-semibold hover:border-blue-500 transition-all cursor-pointer ${
                        input.preferredFormat === item.value
                          ? "bg-blue-50 border-blue-500 text-blue-700 ring-4 ring-blue-500/10 font-bold"
                          : "bg-white border-slate-200/80 text-slate-600"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Trigger Button */}
            <button
              onClick={() => generateResponse(false)}
              disabled={isLoading || (!input.category && !input.summary && !input.request)}
              className="w-full py-4 mt-auto bg-blue-600 text-white font-extrabold rounded-xl shadow-lg shadow-blue-500/15 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 text-xs tracking-wider uppercase font-display"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>분석 및 초안 추출 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>응대 초안 생성하기</span>
                </>
              )}
            </button>

            {/* Side History */}
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-display">
                <History className="w-3.5 h-3.5" />
                최근 분석 보관함 ({history.length})
              </h3>
              {history.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-4 bg-slate-50 text-center rounded-xl border border-dashed border-slate-200">
                  기록 보관함이 비어 있습니다.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="group cursor-pointer p-3 hover:bg-slate-50 border border-slate-100 rounded-xl transition text-xs flex justify-between items-center gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-700 truncate block">{item.input.category}</span>
                        <p className="text-slate-400 truncate text-[10px] mt-0.5">{item.input.summary}</p>
                      </div>
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg hover:bg-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Right Side: Output Preview Panel */}
          <section id="output-panel" className="flex-1 p-6 sm:p-8 md:p-10 bg-[#f4f6fa] overflow-y-auto">
            
            {/* Default Idle State - Upgraded to Micro-Landing & Guide */}
            {!result && !isLoading && (
              <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-12 px-6 min-h-[550px] bg-white border border-slate-200/50 rounded-[32px] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

                {/* Micro-Hero inside idle board */}
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                  <Sparkles className="w-8 h-8" />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight font-display">
                  가맹 영업관리의 최고 조력자
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-3 leading-relaxed font-light">
                  왼쪽 입력란에 가맹점과의 갈등 정황을 간단히 기재하거나, <span className="font-bold text-blue-600">신속 시드 테스트</span>를 클릭하여 즉시 업무 효율을 경험해 보세요!
                </p>

                {/* Core Benefits Quick Showcase Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full text-left">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex gap-3.5 hover:bg-slate-100/50 transition">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">감정적 불만 ➡️ 실무적 니즈 도출</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1 font-light">매출 하락, 본사 신뢰 저하 등 점주의 근본적인 우려를 즉시 위로합니다.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex gap-3.5 hover:bg-slate-100/50 transition">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">3단계 선제 리스크 경고 배지</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1 font-light">위약금 언급, 법적 고소 우려, 대외 언론 제보 가능성을 실시간 파악합니다.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex gap-3.5 hover:bg-slate-100/50 transition">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">자동 미디어 매칭</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1 font-light">상황 중요도에 따라 유선 통화, 공식 이메일, 신속 전파용 알림톡 자동 배정.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex gap-3.5 hover:bg-slate-100/50 transition">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">동적 괄호 자동 변환</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1 font-light">대괄호 공란을 실시간 타이핑 폼에 입력하면 완성본으로 1초 만에 치환.</p>
                    </div>
                  </div>
                </div>

                {/* Direct CTA to landing guide */}
                <div className="mt-8 pt-6 border-t border-slate-100 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50/20 p-5 rounded-2xl border border-blue-100/40">
                  <div className="text-left">
                    <p className="text-xs font-bold text-blue-900">도대체 정서 케어 응대는 무엇이 다른가요?</p>
                    <p className="text-[11px] text-blue-700 mt-0.5 font-light">실제 비포/애프터 비교 및 영업관리 가이드를 만나보세요.</p>
                  </div>
                  <button
                    onClick={() => setViewMode("landing")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 justify-center self-stretch sm:self-auto"
                  >
                    <span>자세히 보기</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            )}

            {/* Processing / Loading State */}
            {isLoading && (
              <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-20 px-6 min-h-[550px] bg-white border border-slate-200/50 rounded-[32px] shadow-sm">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin"></div>
                  <Sparkles className="w-6 h-6 text-blue-500 absolute top-5 left-5 animate-pulse" />
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-800 font-display">가맹점 파트너 정서 분석 및 응대 조율 중</h3>
                <p className="text-xs text-slate-400 mt-2 font-light">심각도 검토 및 가장 적합한 응대 매체를 선정 중입니다.</p>
              </div>
            )}

            {/* Complete Response Results */}
            {result && !isLoading && (
              <div className="max-w-2xl mx-auto space-y-6">
                
                {/* SECTION: Input Ambiguity Clarification Modal */}
                {result.isInputAmbiguous ? (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                    <div className="flex items-start gap-3.5">
                      <div className="bg-amber-100 text-amber-800 p-2.5 rounded-xl shrink-0">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-amber-900 font-display">추가 입력이 필요합니다</h3>
                        <p className="text-xs text-amber-700 mt-1.5 leading-relaxed font-light">
                          최적의 응대 대안과 맞춤형 공감 멘트를 마련하기 위해, 아래의 질문에 조금 더 기재해 주십시오.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-amber-200/40 rounded-2xl p-5 space-y-4 shadow-xs">
                      {result.clarificationQuestions?.map((q, i) => (
                        <div key={i} className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                            <span className="w-4 h-4 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-[10px] font-extrabold">{i+1}</span>
                            {q}
                          </label>
                          <input
                            type="text"
                            value={clarificationAnswers[i] || ""}
                            onChange={(e) => {
                              const updated = [...clarificationAnswers];
                              updated[i] = e.target.value;
                              setClarificationAnswers(updated);
                            }}
                            placeholder="관련 답변을 기재해 주십시오 (공란 가능)"
                            className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2.5 text-xs">
                      <button
                        onClick={clearForm}
                        className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full font-bold text-slate-600 transition cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => generateResponse(true)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg shadow-blue-500/10 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>보완 답변 완료</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Main Actionable Report Container */
                  <>
                    {/* Status Card Header */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                          <span className="font-extrabold text-blue-600">문의 유형:</span> {input.category}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-400">
                          <span className="font-bold text-slate-500">선택한 응대 형식:</span> {result.responseFormatReasoning || "자동 선정"}
                        </p>
                      </div>

                      {/* Level badge */}
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-display">심각도:</span>
                        {result.severity === "매우 높음" && (
                          <span className="bg-red-50 border border-red-200 text-red-700 font-extrabold text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            매우 높음
                          </span>
                        )}
                        {result.severity === "높음" && (
                          <span className="bg-amber-50 border border-amber-200 text-amber-700 font-extrabold text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            높음
                          </span>
                        )}
                        {result.severity === "보통" && (
                          <span className="bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            보통
                          </span>
                        )}
                        {result.severity === "낮음" && (
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 font-extrabold text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            낮음
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Red Risk Warning Signals */}
                    {result.riskWarnings && result.riskWarnings.length > 0 && (
                      <div className="bg-rose-50 border-l-4 border-rose-500 p-5 rounded-2xl shadow-xs space-y-2">
                        <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm uppercase tracking-tight font-display">
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                          <span>🚨 리스크 신호 감지</span>
                        </div>
                        <div className="space-y-1.5">
                          {result.riskWarnings.map((warn, i) => (
                            <p key={i} className="text-xs text-rose-600 leading-relaxed font-light">
                              {warn}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hidden Needs Analysis Banner */}
                    <div className="bg-[#eff3fa] border border-blue-200/50 rounded-3xl p-6 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <h4 className="text-[10px] font-extrabold text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-1 font-display">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        파트너의 숨겨진 니즈 (Hidden Needs) 분석 결과
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        {result.detectedNeeds || "점주가 가장 우려하는 핵심 요인(매출, 단골 손님 이탈, 신뢰도 훼손)을 위로하고 대안을 도출하도록 튜닝되었습니다."}
                      </p>
                    </div>

                    {/* Tab Switching: Interactive editor vs raw markdown */}
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
                      <div className="bg-[#f8f9fc] border-b border-slate-100 px-6 py-3 flex justify-between items-center">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActiveTab("interactive")}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              activeTab === "interactive"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            실시간 공란 보완 편집기
                          </button>
                          <button
                            onClick={() => setActiveTab("markdown")}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              activeTab === "markdown"
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            마크다운 원본 보기
                          </button>
                        </div>
                      </div>

                      {/* INTERACTIVE TAB */}
                      {activeTab === "interactive" && (
                        <div className="p-6 sm:p-8 space-y-8">
                          
                          {/* Dynamic Field Mapping Editor Box */}
                          {Object.keys(placeholders).length > 0 && (
                            <div className="bg-[#f8f9fc] border border-slate-200/60 rounded-2xl p-5 space-y-3.5">
                              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-display">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                괄호 [ ] 속 플레이스홀더를 즉시 채워 완성본을 제작하세요:
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.keys(placeholders).map((name) => (
                                  <div key={name} className="space-y-1.5">
                                    <label className="text-[11px] font-extrabold text-slate-400">{name}</label>
                                    <input
                                      type="text"
                                      value={placeholders[name]}
                                      onChange={(e) => {
                                        setPlaceholders(prev => ({ ...prev, [name]: e.target.value }));
                                      }}
                                      placeholder={`${name} 직접 채우기...`}
                                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Rendering styled templates block */}
                          <div className="space-y-10">
                            {result.drafts && result.drafts.map((draft, idx) => {
                              const replacedTitle = draft.title ? getReplacedText(draft.title) : "";
                              const replacedContent = getReplacedText(draft.content);
                              
                              return (
                                <div key={idx} className="space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-display">
                                      <span className="w-4 h-px bg-slate-300"></span> 
                                      {draft.type === "전화 스크립트" && <Phone className="w-4 h-4 text-blue-600 shrink-0" />}
                                      {draft.type === "이메일" && <Mail className="w-4 h-4 text-blue-600 shrink-0" />}
                                      {draft.type === "문자/카톡" && <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />}
                                      {draft.type}
                                    </h3>
                                    
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => copyToClipboard(draft.content, idx)}
                                        className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200/50 transition flex items-center gap-1 cursor-pointer"
                                        title="[ ] 공란이 유지된 원본 템플릿을 복사합니다."
                                      >
                                        <Clipboard className="w-3.5 h-3.5" />
                                        템플릿 복사
                                      </button>
                                      <button
                                        onClick={() => {
                                          const finalTxt = draft.type === "이메일" 
                                            ? `제목: ${replacedTitle}\n\n${replacedContent}`
                                            : replacedContent;
                                          copyToClipboard(finalTxt, idx + 100);
                                        }}
                                        className="px-3.5 py-1.5 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-full transition flex items-center gap-1 shadow-lg shadow-slate-900/10 cursor-pointer"
                                        title="위 입력칸에 적힌 텍스트로 공란이 자동 변환 채우기 완료된 완성 텍스트를 복사합니다."
                                      >
                                        {copiedDraftIndex === idx + 100 ? (
                                          <>
                                            <Check className="w-3.5 h-3.5" />
                                            완성본 복사완료
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
                                            완성본 복사
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Custom visualization styling based on media type */}
                                  {draft.type === "전화 스크립트" ? (
                                    <div className="bg-[#f0f4fa]/50 rounded-2xl p-6 border border-blue-100/50 text-slate-800 leading-relaxed italic text-xs sm:text-sm font-medium">
                                      "{replacedContent}"
                                    </div>
                                  ) : draft.type === "이메일" ? (
                                    <div className="space-y-3">
                                      {draft.title && (
                                        <div className="p-3 bg-[#f8f9fc] border border-slate-200/60 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
                                          <span className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">제목:</span>
                                          {replacedTitle}
                                        </div>
                                      )}
                                      <div className="p-6 bg-[#f8f9fc] border border-slate-200/60 rounded-2xl text-xs sm:text-sm text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                                        {replacedContent}
                                      </div>
                                    </div>
                                  ) : (
                                    /* Text message / Kakao block */
                                    <div className="relative max-w-sm ml-auto bg-[#ffeb3b]/15 border border-[#ffeb3b]/30 rounded-2xl rounded-tr-none p-4.5 text-xs font-semibold text-slate-800 shadow-xs leading-relaxed whitespace-pre-wrap">
                                      <div className="absolute -top-2.5 right-0 text-[8px] font-extrabold tracking-widest text-amber-800 bg-[#ffeb3b] px-2 py-0.5 rounded-full uppercase">KakaoTalk</div>
                                      {replacedContent}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* RAW MARKDOWN TAB */}
                      {activeTab === "markdown" && (
                        <div className="p-6 sm:p-8">
                          <div className="flex justify-end mb-4">
                            <button
                              onClick={() => copyToClipboard(result.markdownOutput || "", 999, true)}
                              className="px-4 py-2 rounded-full text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 shadow-xs cursor-pointer border border-slate-200/40"
                            >
                              {copiedMarkdown ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  마크다운 복사 완료!
                                </>
                              ) : (
                                <>
                                  <Clipboard className="w-3.5 h-3.5" />
                                  마크다운 복사하기
                                </>
                              )}
                            </button>
                          </div>
                          <div className="markdown-body prose prose-slate max-w-none text-xs leading-relaxed p-6 bg-[#f8f9fc] border border-slate-200/60 rounded-2xl overflow-x-auto whitespace-pre-wrap font-mono">
                            <Markdown>{result.markdownOutput}</Markdown>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Footer text */}
                <p className="text-center text-[10px] text-slate-400 leading-relaxed font-light">
                  * 이 도구가 생성하는 모든 초안은 "참고용"이며, 실제 발송이나 통화 전에 본사 가이드라인과 담당자의 검토를 반드시 거쳐야 합니다.
                </p>
              </div>
            )}
          </section>
        </main>
        )
      )}

      {/* API Key Settings Modal Dialog */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-2xl p-8 max-w-md w-full relative space-y-6">
            <button
              onClick={() => {
                setIsApiKeyModalOpen(false);
                setKeyValidationMsg({ status: null, text: "" });
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition flex items-center justify-center font-bold text-sm cursor-pointer border border-slate-200/30"
            >
              ✕
            </button>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 font-display">
                Gemini API Key 설정
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                개인 API Key를 등록하여 서비스 사용 횟수 제한 없이 무제한으로 고성능 응대 초안을 생성해 보세요.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  현재 등록 상태
                </label>
                {savedApiKey ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2.5 rounded-xl font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>개인 API Key 승인됨 및 활성화 중</span>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2.5 rounded-xl font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>미등록 (기본 제한 모드 작동)</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  API Key 입력
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={userApiKey}
                    onChange={(e) => {
                      setUserApiKey(e.target.value);
                      setKeyValidationMsg({ status: null, text: "" });
                    }}
                    placeholder="AIzaSy..."
                    className="w-full pl-3.5 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono focus:bg-white focus:border-blue-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {keyValidationMsg.text && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2 ${
                  keyValidationMsg.status === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-100"
                }`}>
                  {keyValidationMsg.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{keyValidationMsg.text}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => validateApiKey(userApiKey)}
                  disabled={isKeyValidating}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold rounded-full text-xs transition cursor-pointer flex items-center justify-center gap-1"
                >
                  {isKeyValidating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "검증 및 저장"
                  )}
                </button>
                {savedApiKey && (
                  <button
                    onClick={() => {
                      deleteApiKey();
                      setIsApiKeyModalOpen(false);
                    }}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-rose-600 font-bold rounded-full text-xs transition cursor-pointer"
                  >
                    인증 해제
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1.5 text-[10px] text-slate-400">
              <p className="flex items-center gap-1 font-medium">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                구글 Gemini API Key는 Google AI Studio에서 1초 만에 무료로 발급받으실 수 있습니다.
              </p>
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500 hover:underline font-bold inline-flex items-center gap-0.5"
              >
                <span>Google AI Studio 바로가기</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
