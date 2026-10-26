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
      {/* 1. CHAT WINDOW POPOVER (OCEAN BLUE THEME & 3 CORE AI CAPABILITIES)        */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          id="ai-chat-window"
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[92vw] sm:w-[410px] h-[550px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-blue-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-['Plus_Jakarta_Sans',sans-serif]"
        >
          {/* Header - Ocean Blue / Cyan Gradient */}
          <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-600 p-3.5 text-white flex items-center justify-between shadow-sm select-none">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                  <Bot className="w-5 h-5 text-cyan-100" />
                </div>
                {/* Online Indicator Badge */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-blue-700 rounded-full animate-pulse"></span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base leading-tight tracking-tight flex items-center gap-1.5">
                  <span>Trợ lý AI Thể hình</span>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-100 font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Online • Tư vấn thông minh 24/7</span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Làm mới đoạn chat"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ cửa sổ"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Đóng cửa sổ"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3 CHỨC NĂNG CHÍNH ACTION CHIPS (TOP TOOLBAR) */}
          <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-cyan-50/90 border-b border-blue-100/80 px-2.5 py-2">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 mb-1.5 px-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Chức năng Trợ lý AI:</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {mainFeatureChips.slice(0, 3).map((feat) => {
                const IconComponent = feat.icon;
                return (
                  <button
                    key={feat.id}
                    type="button"
                    onClick={() => handleSendMessage(feat.prompt)}
                    disabled={loading}
                    className="flex flex-col items-center justify-center p-1.5 bg-white rounded-xl border border-blue-200/80 hover:border-blue-500 hover:bg-blue-600 hover:text-white text-slate-700 shadow-xs transition-all duration-150 group text-center disabled:opacity-50"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform mb-0.5">
                      {feat.emoji}
                    </span>
                    <span className="text-[10px] font-bold leading-tight group-hover:text-white">
                      {feat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body: Messages List */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/70 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {/* Sender Avatar & Name label */}
                <div className="flex items-center gap-1 mb-1 px-1 text-[10px] text-slate-400 font-semibold">
                  {msg.sender === "ai" ? (
                    <>
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      <span>GymAI Coach</span>
                    </>
                  ) : (
                    <span>Bạn</span>
                  )}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble Content */}
                <div
                  className={`max-w-[92%] rounded-2xl p-3 shadow-sm ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm font-medium shadow-blue-500/20"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm space-y-2.5"
                  }`}
                >
                  {/* Formatted Text Content */}
                  {msg.text && (
                    <div className="leading-relaxed whitespace-pre-line">
                      {renderFormattedText(msg.text)}
                    </div>
                  )}

                  {/* Recommended Packages Cards Display */}
                  {msg.recommended_packages && msg.recommended_packages.length > 0 && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                        <Award className="w-3.5 h-3.5 text-blue-600" />
                        <span>Gợi ý gói tập phù hợp từ CSDL:</span>
                      </div>

                      <div className="space-y-2">
                        {msg.recommended_packages.map((pkg) => (
                          <div
                            key={pkg.id}
                            className="p-3 bg-gradient-to-br from-blue-50/80 to-cyan-50/40 rounded-xl border border-blue-200/90 shadow-sm space-y-1.5 text-left"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200">
                                {pkg.badge || "Gói Đề Xuất"}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                {pkg.duration_days} ngày
                              </span>
                            </div>

                            <div className="font-extrabold text-xs text-slate-900 leading-snug">
                              {pkg.name}
                            </div>

                            <div className="text-sm font-extrabold text-blue-600">
                              {formatVND(pkg.price)}
                            </div>

                            {pkg.commitments && (
                              <div className="text-[10px] font-semibold text-blue-900 bg-white/90 p-1.5 rounded-lg border border-blue-100 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span className="line-clamp-1">{pkg.commitments}</span>
                              </div>
                            )}

                            {/* Direct CTA button to register */}
                            <button
                              type="button"
                              onClick={() => handleRegisterNow(pkg)}
                              className="w-full mt-2 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow transition-all flex items-center justify-center gap-1.5 group cursor-pointer"
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
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-3 shadow-sm flex items-center gap-2 text-xs text-slate-500">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span>AI đang phân tích & lập phản hồi...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips Bar */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickSuggestions.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-blue-50/80 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200/70 text-[10px] font-bold transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Footer: Input Form */}
          <div className="p-3 bg-white border-t border-slate-200">
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
                placeholder="Hỏi AI về giáo án, dinh dưỡng, tiến độ, gói tập..."
                disabled={loading}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md shadow-blue-500/25 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 cursor-pointer"
                title="Gửi câu hỏi"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
            <div className="text-[9px] text-center text-slate-400 mt-1 font-medium">
              GymAI Assistant • Tích hợp Giáo án, Dinh dưỡng & Dữ liệu CSDL thời gian thực
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CHAT BUBBLE BUTTON (FIXED BOTTOM-RIGHT, OCEAN BLUE THEME)               */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          id="btn-floating-ai-chat"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 cursor-pointer ${
            isOpen
              ? "bg-slate-900 text-white rotate-90 hover:scale-105"
              : "bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 text-white hover:scale-110 shadow-blue-500/40 ring-4 ring-blue-500/20"
          }`}
          title={isOpen ? "Đóng Trợ lý AI" : "Chat cùng Trợ lý AI Thể hình"}
        >
          {isOpen ? (
            <X className="w-6 h-6 stroke-[2.5]" />
          ) : (
            <>
              {/* Main Icon */}
              <div className="relative">
                <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-md" />
                <Sparkles className="w-3.5 h-3.5 text-cyan-200 absolute -top-1 -right-1 animate-pulse" />
              </div>

              {/* Notification Badge (Số 1 màu đỏ) */}
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                  1
                </span>
              )}
            </>
          )}

          {/* Hover Tooltip Label */}
          {!isOpen && (
            <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Trợ lý AI Thể hình (Online)</span>
            </span>
          )}
        </button>
      </div>
    </>
  );
};
