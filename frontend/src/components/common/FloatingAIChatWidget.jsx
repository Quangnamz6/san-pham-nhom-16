import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { aiService } from "../../services/aiService";
import { useAuth } from "../../context/AuthContext";
import {
  Sparkles,
  Bot,
  X,
  Minus,
  Send,
  Dumbbell,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Tag,
  Flame,
  Heart,
  Award,
  Calendar,
  Utensils,
  BarChart3,
  BadgePercent,
  CheckCheck,
} from "lucide-react";

export const FloatingAIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initial welcome message
  const initialMessages = [
    {
      id: "welcome-1",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: `Xin chào ${user?.full_name || "bạn"}! 👋 Tôi là **Trợ lý Thể hình AI & Chuyên viên Tư vấn Gym Thông minh**.\n\nTôi có thể hỗ trợ bạn trực tiếp 3 tính năng cốt lõi:\n1. 🏋️‍♂️ **Lập giáo án & lịch tập cá nhân hóa**\n2. 🥗 **Tư vấn dinh dưỡng & thực đơn khoa học**\n3. 📊 **Tóm tắt & phân tích tiến độ tập luyện**\n\nBạn cũng có thể hỏi bất kỳ thắc mắc nào về gói tập và dịch vụ của chúng tôi!`,
      type: "chat",
      recommended_packages: [],
    },
  ];

  const [messages, setMessages] = useState(initialMessages);

  // 3 Chức năng chính theo yêu cầu (Action Chips / Tabs)
  const mainFeatureChips = [
    {
      id: "workout",
      icon: Dumbbell,
      label: "Tạo Giáo Án Lịch Tập",
      emoji: "🏋️‍♂️",
      prompt: "Hãy lập giúp tôi một giáo án và lịch tập luyện thể hình chi tiết 4 buổi/tuần (kèm bài tập, hiệp tập, thời gian nghỉ và lưu ý kỹ thuật).",
    },
    {
      id: "nutrition",
      icon: Utensils,
      label: "Tư Vấn Chế Độ Dinh Dưỡng",
      emoji: "🥗",
      prompt: "Hãy tư vấn giúp tôi chế độ dinh dưỡng, khẩu phần ăn khoa học (calo, protein, carb, fat) và thực đơn mẫu hàng ngày để đạt vóc dáng săn chắc.",
    },
    {
      id: "progress",
      icon: BarChart3,
      label: "Xem Tóm Tắt Tiến Độ",
      emoji: "📊",
      prompt: "Hãy tóm tắt và phân tích tiến độ tập luyện của tôi trong 30 ngày qua, đánh giá chỉ số InBody và đưa ra lời khuyên cải thiện.",
    },
    {
      id: "package",
      icon: BadgePercent,
      label: "Tư Vấn Gói Tập",
      emoji: "💎",
      prompt: "Tư vấn cho tôi các gói tập phù hợp nhất hiện có trong hệ thống kèm giá niêm yết và cam kết chất lượng.",
    },
  ];

  // Quick suggestion prompts
  const quickSuggestions = [
    { label: "Gói giảm cân cấp tốc 1 tháng", prompt: "Tư vấn gói giảm cân 1 tháng giảm khoảng 2-4kg" },
    { label: "Gói tập nhẹ nhàng cho người mới", prompt: "Gói tập nào nhẹ nhàng cho người mới bắt đầu?" },
    { label: "Gói tập dành riêng cho Nữ", prompt: "Gói tập nào dành cho nữ muốn săn chắc vòng 3 và eo thon?" },
    { label: "Gói sinh viên giá rẻ", prompt: "Có gói tập nào giá rẻ ưu đãi cho sinh viên không?" },
  ];

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen, messages]);

  // Listen to global open-ai-chat events (from Sidebar, Header, or Buttons)
  useEffect(() => {
    const handleOpenEvent = (e) => {
      setIsOpen(true);
      setHasUnread(false);
      if (e.detail?.prompt) {
        handleSendMessage(e.detail.prompt);
      } else if (e.detail?.mode) {
        const found = mainFeatureChips.find((c) => c.id === e.detail.mode);
        if (found) {
          handleSendMessage(found.prompt);
        }
      }
    };

    window.addEventListener("open-ai-chat", handleOpenEvent);
    return () => window.removeEventListener("open-ai-chat", handleOpenEvent);
  }, [messages, loading]);

  // Copy helper
  const handleCopy = (text, index) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  // Reset chat history
  const handleResetChat = () => {
    setMessages(initialMessages);
    setInputMessage("");
  };

  // Navigate to package registration
  const handleRegisterNow = (pkg) => {
    navigate("/member/packages", { state: { selectedPackageId: pkg.id } });
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  // Send message and get AI response
  const handleSendMessage = async (customPrompt = null) => {
    const promptToSend = (customPrompt || inputMessage).trim();
    if (!promptToSend || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: promptToSend,
      type: "chat",
    };

    // Format chat history for multi-turn LLM context
    const currentHistory = messages
      .filter((m) => m.type !== "error")
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text || "",
      }));

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const data = await aiService.chat(promptToSend, currentHistory);

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: data.reply || "Tôi đã nhận được câu hỏi của bạn.",
        intent: data.intent || "general_chat",
        recommended_packages: data.recommended_packages || [],
        type: "chat",
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Xin lỗi, hiện tại máy chủ AI đang bận. Vui lòng thử lại sau giây lát.";

      const errorMsg = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `⚠️ **Thông báo hệ thống:**\n${typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg)}`,
        type: "error",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format markdown-like text with bold and list styling
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split("\n");

    return lines.map((line, idx) => {
      // Parse **bold** parts
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-extrabold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");

      return (
        <span
          key={idx}
          className={`block ${isBullet ? "pl-2 py-0.5 text-slate-700 font-medium" : "py-0.5"}`}
        >
          {formattedParts}
        </span>
      );
    });
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. CHAT WINDOW POPOVER (APPLE / LINEAR STYLE LUXURY DARK FLOATING CARD)   */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          id="ai-chat-window"
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[94vw] sm:w-[440px] h-[590px] max-h-[85vh] bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] border border-slate-800/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 font-['Plus_Jakarta_Sans',sans-serif]"
        >
          {/* Header - Luxury Royal Ocean Blue to Cyan Glow */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 p-4 text-white flex items-center justify-between border-b border-slate-800/80 shadow-md select-none relative overflow-hidden">
            {/* Subtle neon reflection */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white border border-cyan-400/30 shadow-lg shadow-cyan-500/25">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                {/* AI Ready Pulsing Indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-cyan-400 border-2 border-slate-900 rounded-full shadow-[0_0_8px_#22d3ee]"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm sm:text-base leading-tight tracking-tight text-white">
                    Trợ Lý AI Thể Hình
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                    LUXURY
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-cyan-200/80 font-semibold mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                  </span>
                  <span>AI Ready • Cố vấn thể hình & Dinh dưỡng 24/7</span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 relative z-10">
              <button
                type="button"
                onClick={handleResetChat}
                title="Làm mới đoạn chat"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ cửa sổ"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Đóng cửa sổ"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3 CHỨC NĂNG CHÍNH ACTION CHIPS (TOP TOOLBAR) */}
          <div className="bg-slate-950/80 border-b border-slate-800/80 px-3 py-2.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-0.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Năng Lực Cốt Lõi:</span>
              </span>
              <span className="text-[9px] text-cyan-400 font-bold">1-Click Prompt</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {mainFeatureChips.slice(0, 3).map((feat) => {
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => handleSendMessage(feat.prompt)}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-2 bg-slate-900/90 backdrop-blur-xs rounded-xl border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300 text-slate-300 shadow-2xs hover:shadow-[0_0_12px_rgba(0,200,255,0.2)] transition-all duration-200 group text-center disabled:opacity-50 cursor-pointer"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform mb-0.5">
                      {feat.emoji}
                    </span>
                    <span className="text-[10px] font-bold leading-tight group-hover:text-cyan-300 line-clamp-1">
                      {feat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body: Messages List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-950/70 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {/* Sender Avatar & Name label */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400 font-bold">
                  {msg.sender === "ai" ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-xs">
                        <Sparkles className="w-2 h-2" />
                      </div>
                      <span className="text-cyan-400 font-extrabold tracking-wide">GymAI Coach</span>
                    </>
                  ) : (
                    <span className="text-slate-300">Bạn</span>
                  )}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble Content */}
                <div
                  className={`max-w-[90%] p-3.5 shadow-md transition-all ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white rounded-2xl rounded-tr-none font-medium shadow-cyan-500/20"
                      : "bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-200 rounded-2xl rounded-tl-none space-y-2.5 shadow-black/40"
                  }`}
                >
                  {/* Formatted Text Content */}
                  {msg.text && (
                    <div className="leading-relaxed whitespace-pre-line text-[12px] text-slate-100">
                      {renderFormattedText(msg.text)}
                    </div>
                  )}

                  {/* Recommended Packages Cards Display */}
                  {msg.recommended_packages && msg.recommended_packages.length > 0 && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-cyan-400">
                        <Award className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Gợi ý gói tập phù hợp từ CSDL:</span>
                      </div>

                      <div className="space-y-2">
                        {msg.recommended_packages.map((pkg) => (
                          <div
                            key={pkg.id}
                            className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 shadow-md space-y-1.5 text-left"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                {pkg.badge || "Gói Đề Xuất"}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400">
                                {pkg.duration_days} ngày
                              </span>
                            </div>

                            <div className="font-extrabold text-xs text-white leading-snug">
                              {pkg.name}
                            </div>

                            <div className="text-sm font-black text-cyan-400 tracking-tight">
                              {formatVND(pkg.price)}
                            </div>

                            {pkg.commitments && (
                              <div className="text-[10px] font-semibold text-slate-300 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                <span className="line-clamp-1">{pkg.commitments}</span>
                              </div>
                            )}

                            {/* Direct CTA button to register */}
                            <button
                              type="button"
                              onClick={() => handleRegisterNow(pkg)}
                              className="w-full mt-2 py-1.5 px-3 rounded-lg gradient-btn-primary font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 group cursor-pointer text-white"
                            >
                              <span>Đăng ký ngay</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copy button for AI replies */}
                  {msg.sender === "ai" && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.text, idx)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing / Thinking Indicator */}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm p-3 shadow-md flex items-center gap-2 text-xs text-slate-300">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span>AI đang phân tích & lập giáo án...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips Bar */}
          <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickSuggestions.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.prompt)}
                disabled={loading}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-800 hover:border-cyan-500/40 text-[10px] font-extrabold transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xs"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Footer: Input Form */}
          <div className="p-3 bg-slate-950 border-t border-slate-800/90">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi AI về giáo án, thực đơn dinh dưỡng, gói tập..."
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 disabled:opacity-50 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2.5 rounded-2xl gradient-btn-primary hover:opacity-95 text-white shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                title="Gửi câu hỏi"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <div className="text-[9px] text-center text-slate-500 mt-1.5 font-medium flex items-center justify-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
              <span>GymAI Neural Core • Phân tích dinh dưỡng, lịch tập & CSDL thời gian thực</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CHAT BUBBLE BUTTON (3D SPHERICAL ORB WITH PULSING RING EFFECT)          */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative flex items-center justify-center">
          {/* Pulsing Concentric Outer Rings (Khi chưa mở cửa sổ) */}
          {!isOpen && (
            <>
              <span className="absolute -inset-2.5 rounded-full bg-cyan-400/25 animate-ping pointer-events-none duration-1000"></span>
              <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-400/30 animate-pulse pointer-events-none"></span>
            </>
          )}

          <button
            id="btn-floating-ai-chat"
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
              isOpen
                ? "bg-slate-900 text-white rotate-90 hover:scale-105 shadow-2xl shadow-slate-900/50"
                : "bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-400 text-white hover:scale-110 shadow-[0_12px_30px_-4px_rgba(0,102,255,0.45),inset_0_2px_4px_rgba(255,255,255,0.45)] ring-4 ring-cyan-400/30"
            }`}
            title={isOpen ? "Đóng Trợ lý AI" : "Chat cùng Trợ lý AI Thể hình"}
          >
            {isOpen ? (
              <X className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <>
                {/* 3D Orb Main Icon */}
                <div className="relative">
                  <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />
                  <Sparkles className="w-4 h-4 text-cyan-200 absolute -top-1 -right-1 animate-pulse drop-shadow" />
                </div>

                {/* Notification Badge (Số 1 màu đỏ) */}
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">
                    1
                  </span>
                )}
              </>
            )}

            {/* Hover Tooltip Label */}
            {!isOpen && (
              <span className="absolute right-full mr-3.5 px-3.5 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none hidden sm:flex items-center gap-2 border border-slate-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <span>Hỏi Trợ lý AI Thể hình (Online)</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

