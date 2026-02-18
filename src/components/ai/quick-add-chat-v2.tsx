import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Sparkles, X, Zap, Activity, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { parseTransactionV2Action } from "@/actions/ai-actions-v2";
import { PreviewCard } from "./preview-card";
import { createTransaction } from "@/actions/transaction-actions";
import { learnPatternAction } from "@/actions/ai-learn-actions";
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2";
import { toast } from "sonner";
import type { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import type { ChatMessage, ParsedTransaction } from "@/types/ai.types";

import { AIReminder } from "@/actions/ai-reminder-actions";

interface QuickAddChatV2Props {
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];
    variant?: "floating" | "inline";
    contextPage?: "people" | "people_detail" | "accounts" | "transactions" | "batch" | "debt";
    currentPersonId?: string;
    reminders?: AIReminder[];
}

export function QuickAddChatV2({
    accounts,
    categories,
    people,
    shops,
    variant = "floating",
    contextPage,
    currentPersonId,
    reminders = []
}: QuickAddChatV2Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSlideOpen, setIsSlideOpen] = useState(false);
    const [slideData, setSlideData] = useState<any>(null);

    const handleOpenSlide = (data: ParsedTransaction) => {
        // Map AI specific intents to DB transaction types for the Slide
        let dbType: "income" | "expense" | "transfer" | "debt" | "repayment" = "expense";
        const intent = data.intent?.toLowerCase();

        if (intent === "income") dbType = "income";
        else if (intent === "transfer") dbType = "transfer";
        else if (intent === "debt" || intent === "lend" || intent === "loan") dbType = "debt";
        else if (intent === "repayment" || intent === "repay") dbType = "repayment";

        // Map ParsedTransaction to TransactionSlideV2's initialData format
        const initialData = {
            type: dbType,
            amount: data.amount || 0,
            note: data.note || "",
            occurred_at: data.occurred_at ? new Date(data.occurred_at) : new Date(),
            source_account_id: data.source_account_id || accounts[0]?.id || "",
            category_id: data.category_id || undefined,
            shop_id: data.shop_id || undefined,
            person_id: data.people?.[0]?.id || undefined,
            cashback_share_percent: data.cashback_share_percent || undefined,
            cashback_share_fixed: data.cashback_share_fixed || undefined,
            cashback_mode: data.cashback_mode || (data.cashback_share_percent || data.cashback_share_fixed ? "percent" : "none_back"),
            ui_is_cashback_expanded: !!(data.cashback_share_percent || data.cashback_share_fixed),
            metadata: { source: 'chatbot' }
        };

        setSlideData(initialData);
        setIsSlideOpen(true);
        // setOpen(false); // Optionally close chat when slide opens
    };

    // Persistence: Load messages from local storage
    useEffect(() => {
        const savedMessages = localStorage.getItem("mf_chat_history");
        const savedOpen = localStorage.getItem("mf_chat_open");
        if (savedMessages) {
            try {
                setMessages(JSON.parse(savedMessages));
            } catch (e) {
                console.error("Failed to parse saved messages", e);
            }
        }
        if (savedOpen === "true") setOpen(true);
    }, []);

    // Persistence: Save messages to local storage
    useEffect(() => {
        localStorage.setItem("mf_chat_history", JSON.stringify(messages));
        localStorage.setItem("mf_chat_open", open.toString());
    }, [messages, open]);

    // Proactive Reminders Logic
    useEffect(() => {
        if (reminders.length > 0) {
            const hasCritical = reminders.some(r => r.severity === 'critical' || r.days_remaining <= 1);

            // Inject reminders into chat if not already there
            const reminderMessages = reminders.map(r => ({
                id: r.id,
                role: "assistant" as const,
                content: `🔔 **NHẮC NHỞ:** ${r.message}`,
                metadata: { provider: "system_reminder" }
            }));

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newReminders = reminderMessages.filter(rm => !existingIds.has(rm.id));
                if (newReminders.length === 0) return prev;
                return [...prev, ...newReminders];
            });

            // Auto-open if critical
            if (hasCritical) {
                const hasOpenedBefore = sessionStorage.getItem(`mf_reminder_opened_${new Date().toDateString()}`);
                if (!hasOpenedBefore) {
                    setOpen(true);
                    sessionStorage.setItem(`mf_reminder_opened_${new Date().toDateString()}`, "true");
                }
            }
        }
    }, [reminders]);
    const handleParse = async (overrideInput?: string) => {
        const textToParse = overrideInput || input;
        if (!textToParse.trim() || isParsing) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: textToParse
        };

        setMessages(prev => [...prev, userMessage]);
        setIsParsing(true);
        const startTime = Date.now();

        try {
            const result = await parseTransactionV2Action(textToParse, {
                accounts: accounts.map(a => ({ id: a.id, name: a.name })),
                categories: categories.map(c => ({ id: c.id, name: c.name })),
                people: people.map(p => ({ id: p.id, name: p.name })),
                shops: shops.map(s => ({ id: s.id, name: s.name })),
                groups: [],
                previousData: parsedData || undefined,
                context_page: contextPage,
                current_person_id: currentPersonId
            });

            if (result.success && result.data) {
                setParsedData(result.data);
                const latency = Date.now() - startTime;
                const newMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: result.data.feedback || "Vui lòng kiểm tra lại thông tin giao dịch bên dưới:",
                    metadata: {
                        latency,
                        tokens: result.metadata?.tokens || 0,
                        provider: result.metadata?.provider
                    }
                };
                setMessages(prev => [...prev, newMessage]);
                if (!overrideInput) setInput("");
            } else {
                toast.error(result.error || "Không thể xử lý yêu cầu");
            }
        } catch (error) {
            console.error("Parse Error:", error);
            toast.error("Đã xảy ra lỗi khi xử lý tin nhắn");
        } finally {
            setIsParsing(false);
        }
    };

    const handleConfirmTransaction = async (data: ParsedTransaction) => {
        setIsCreating(true);

        try {
            // Get current month tag
            const now = new Date();
            const tag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Map AI specific intents to DB transaction types
            let dbType: "income" | "expense" | "transfer" | "debt" | "repayment" = "expense";
            const intent = data.intent?.toLowerCase();

            if (intent === "income") dbType = "income";
            else if (intent === "transfer") dbType = "transfer";
            else if (intent === "debt" || intent === "lend" || intent === "loan") dbType = "debt";
            else if (intent === "repayment" || intent === "repay") dbType = "repayment";

            // Map parsed data to CreateTransactionInput format
            const transactionData = {
                type: dbType,
                amount: data.amount!,
                note: data.note || "",
                occurred_at: data.occurred_at || new Date().toISOString(),
                source_account_id: data.source_account_id!,
                category_id: data.category_id || null,
                shop_id: data.shop_id || null,
                person_id: data.people?.[0]?.id || null,
                destination_account_id: data.debt_account_id || null,
                debt_account_id: data.debt_account_id || null,
                tag,
                cashback_share_percent: data.cashback_share_percent || null,
                cashback_share_fixed: data.cashback_share_fixed || null,
                cashback_mode: data.cashback_mode || null
            };

            const transactionId = await createTransaction(transactionData);

            if (transactionId) {
                toast.success("✅ Đã tạo transaction thành công!");

                const successMsg: ChatMessage = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: `Đã ghi nhận: ${data.amount?.toLocaleString()}đ (${data.note})`
                };
                setMessages(prev => [...prev, successMsg]);
                setParsedData(null);

                router.refresh();

                // Learning: Store patterns asynchronously
                const lastUserInput = messages.filter(m => m.role === 'user').pop()?.content || "";
                if (lastUserInput) {
                    // Learn Account
                    const account = accounts.find(a => a.id === data.source_account_id);
                    if (account) learnPatternAction(lastUserInput, { entity_type: 'account', entity_id: account.id, entity_name: account.name });

                    // Learn Category
                    const category = categories.find(c => c.id === data.category_id);
                    if (category) learnPatternAction(lastUserInput, { entity_type: 'category', entity_id: category.id, entity_name: category.name });

                    // Learn Shop
                    const shop = shops.find(s => s.id === data.shop_id);
                    if (shop) learnPatternAction(lastUserInput, { entity_type: 'shop', entity_id: shop.id, entity_name: shop.name });
                }
            } else {
                toast.error("❌ Lỗi: Không thể tạo transaction");
            }
        } catch (error: any) {
            toast.error(`❌ Lỗi: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCancelPreview = () => {
        setParsedData(null);
    };

    const clearHistory = () => {
        if (confirm("Xóa toàn bộ lịch sử chat?")) {
            setMessages([]);
            localStorage.removeItem("mf_chat_history");
        }
    };

    const unreadRemindersCount = messages.filter(m => m.metadata?.provider === "system_reminder" && !open).length;

    if (variant === "floating") {
        return (
            <>
                {/* Floating Button */}
                {!open && (
                    <button
                        onClick={() => setOpen(true)}
                        className={cn(
                            "fixed bottom-5 right-5 z-[40] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl transition-all hover:scale-110 hover:shadow-blue-500/50",
                            unreadRemindersCount > 0 && "animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                        )}
                    >
                        <div className="relative">
                            <Sparkles className="h-6 w-6" />
                            {unreadRemindersCount > 0 && (
                                <span className="absolute -top-3 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-bounce">
                                    {unreadRemindersCount}
                                </span>
                            )}
                        </div>
                    </button>
                )}

                {/* Chat Dialog */}
                {open && (
                    <div className="fixed bottom-20 right-4 z-[40] flex h-[600px] w-[400px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">AI Assistant</h2>
                                    <p className="text-[10px] text-slate-400 font-medium">Powered by Groq + Gemini</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={clearHistory}
                                    className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                    title="Clear history"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setOpen(false)}
                                    className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 space-y-3 overflow-y-auto p-4">
                            {messages.length === 0 && (
                                <div className="flex h-full flex-col items-center justify-center text-center">
                                    <Sparkles className="mb-3 h-12 w-12 text-slate-300" />
                                    <p className="text-sm font-semibold text-slate-600">
                                        Xin chào! Tôi là AI Assistant
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Nhập giao dịch bằng tiếng Việt tự nhiên
                                    </p>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex gap-2",
                                        msg.role === "user" ? "justify-end" : "justify-start"
                                    )}
                                >
                                    {msg.role === "assistant" && (
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                    )}
                                    <div
                                        className={cn(
                                            "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                            msg.role === "user"
                                                ? "rounded-br-none bg-blue-600 text-white"
                                                : "rounded-bl-none border border-slate-100 bg-white text-slate-700"
                                        )}
                                    >
                                        <div className="whitespace-pre-wrap break-words leading-relaxed">
                                            {msg.content}
                                        </div>
                                        {msg.metadata && (
                                            <div className={cn(
                                                "mt-2 flex items-center gap-2 text-[9px] font-medium uppercase tracking-wider",
                                                msg.role === "user" ? "text-blue-200" : "text-slate-400"
                                            )}>
                                                <span className="flex items-center gap-1">
                                                    <Zap className="h-2.5 w-2.5" />
                                                    {msg.metadata.latency}ms
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Activity className="h-2.5 w-2.5" />
                                                    {msg.metadata.tokens} tokens
                                                </span>
                                                {msg.metadata.provider && (
                                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5">
                                                        {msg.metadata.provider}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Preview Card */}
                            {parsedData && (
                                <PreviewCard
                                    parsedData={parsedData}
                                    accounts={accounts}
                                    categories={categories}
                                    people={people}
                                    shops={shops}
                                    onConfirm={handleConfirmTransaction}
                                    onCancel={handleCancelPreview}
                                    onOpenSlide={handleOpenSlide}
                                />
                            )}
                        </div>

                        {/* Input */}
                        <div className="border-t border-slate-200 p-4">
                            <div className="flex gap-2">
                                <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ví dụ: Ăn sáng 50k thẻ MSB"
                                    className="min-h-[60px] resize-none"
                                    disabled={isParsing || isCreating}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleParse();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={() => handleParse()}
                                    disabled={isParsing || !input.trim() || isCreating}
                                    className="h-[60px] w-[60px] shrink-0"
                                >
                                    {isParsing || isCreating ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Sparkles className="h-5 w-5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Transaction Slide V2 Integration */}
                <TransactionSlideV2
                    open={isSlideOpen}
                    onOpenChange={setIsSlideOpen}
                    initialData={slideData}
                    accounts={accounts}
                    categories={categories}
                    people={people}
                    shops={shops}
                    onBackButtonClick={() => {
                        setIsSlideOpen(false);
                    }}
                    onSuccess={() => {
                        setIsSlideOpen(false);
                        setParsedData(null);
                        router.refresh();
                        toast.success("Giao dịch đã được lưu từ Slide!");
                    }}
                />
            </>
        );
    }

    return null;
}
