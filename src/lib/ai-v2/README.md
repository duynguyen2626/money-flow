# AI Chatbot V2 - Multi-Provider Architecture

## 🎯 Overview
Chatbot V2 sử dụng kiến trúc **Multi-Provider** với tự động fallback khi quota hết:
- **Groq** (Primary): Llama 3.3 70B - Cực nhanh, 14.4k req/day
- **Gemini** (Secondary): Gemini 2.0 Flash - 1.5k req/day  
- **Fallback** (Tertiary): Regex parser - Instant, không cần AI

## 📁 File Structure
```
src/
├── components/ai/
│   ├── quick-add-chat-v2.tsx       # UI V2 (modern, gradient design)
│   └── global-ai.tsx                # Global wrapper
├── components/ai-v1/                # Archived V1 chatbot
│   └── quick-add-chat.tsx
├── lib/ai-v2/
│   ├── ai-router.ts                 # Smart routing logic
│   ├── types.ts                     # Type definitions
│   └── providers/
│       ├── groq.ts                  # Groq provider
│       ├── gemini.ts                # Gemini provider
│       └── fallback.ts              # Regex fallback
└── actions/
    └── ai-actions-v2.ts             # Server action
```

## 🚀 Setup

### 1. Install Dependencies
```bash
pnpm add groq-sdk
```

### 2. Configure API Keys (.env.local)
```env
# Primary Provider (Groq - Free 14.4k/day)
GROQ_API_KEY=gsk_...

# Secondary Provider (Gemini - Free 1.5k/day)
GEMINI_API_KEY=AIzaSy...

# Persona (optional)
AI_PERSONA=strict  # options: strict, funny, advisor
```

### 3. Get API Keys

#### Groq (Recommended - Highest Limit)
1. Visit: https://console.groq.com
2. Sign up (free, no credit card)
3. Create API key
4. Limit: **14,400 requests/day** (60 req/min)

#### Gemini (Backup)
1. Visit: https://aistudio.google.com/apikey
2. Create API key
3. Limit: **1,500 requests/day** (15 req/min)

## 🎨 UI Features

### Modern Design
- **Floating Button**: Gradient blue-purple with Sparkles icon
- **Chat Dialog**: 400x600px, rounded corners, shadow
- **Message Bubbles**: User (blue) vs AI (white)
- **Metadata Display**: Provider, tokens, latency

### Smart Parsing
- **One-shot parsing**: Parse toàn bộ câu một lần
- **No step-by-step**: Không hỏi từng bước như V1
- **Preview Card** (TODO): Hiển thị kết quả parse ngay trong chat

## 🔧 How It Works

### 1. User Input
```
User: "Ăn sáng 50k thẻ MSB"
```

### 2. AI Router Logic
```typescript
1. Try Groq (Llama 3.3 70B)
   ✅ Success → Return result
   ❌ Fail → Record failure, try next

2. Try Gemini (Gemini 2.0 Flash)
   ✅ Success → Return result
   ❌ Fail → Record failure, try next

3. Fallback (Regex)
   ✅ Always succeeds (instant)
```

### 3. Response
```json
{
  "success": true,
  "data": {
    "intent": "expense",
    "amount": 50000,
    "source_account_name": "MSB",
    "note": "Ăn sáng",
    "feedback": "Ăn sáng 50k à? Tiết kiệm thế! 😏"
  },
  "metadata": {
    "provider": "groq",
    "tokens": 245,
    "latency": 523,
    "model": "llama-3.3-70b-versatile"
  }
}
```

## 📊 Provider Comparison

| Provider | Model | Free Limit | Speed | Accuracy |
|----------|-------|------------|-------|----------|
| **Groq** ⭐ | Llama 3.3 70B | 14.4k/day | ⚡ 0.5s | 95% |
| **Gemini** | Gemini 2.0 Flash | 1.5k/day | ⚡ 1s | 98% |
| **Fallback** | Regex | Unlimited | ⚡ <0.1s | 60% |

## 🛡️ Error Handling

### Cooldown System
- After **3 consecutive failures**, provider enters **5-minute cooldown**
- Router automatically skips providers in cooldown
- Cooldown resets on successful request

### Quota Exceeded
```
Groq quota exceeded → Try Gemini
Gemini quota exceeded → Use Fallback
```

## 🎯 Usage Examples

### Basic Usage
```typescript
import { parseTransactionV2Action } from "@/actions/ai-actions-v2";

const response = await parseTransactionV2Action("Ăn sáng 50k thẻ MSB", {
  accounts: [...],
  categories: [...],
  people: [...],
  shops: [...]
});

if (response.success) {
  console.log("Parsed:", response.data);
  console.log("Provider:", response.metadata?.provider);
}
```

### Monitor Provider Status
```typescript
import { getAIProviderStatusAction } from "@/actions/ai-actions-v2";

const status = await getAIProviderStatusAction();
console.log(status.data);
// {
//   groq: { available: true, failures: 0, inCooldown: false },
//   gemini: { available: true, failures: 2, inCooldown: false },
//   fallback: { available: true, failures: 0, inCooldown: false }
// }
```

## 🔮 Next Steps (Phase 2)

### Preview Card Component
- [ ] Inline transaction preview in chat
- [ ] Edit fields directly in chat
- [ ] Confirm button → Submit to database

### Quick Actions
- [ ] "Duplicate last transaction"
- [ ] Template shortcuts
- [ ] Voice input (Gemini Live API)

### Additional Providers
- [ ] OpenRouter (GPT-3.5, Claude Haiku)
- [ ] Hugging Face (Mixtral 8x7B)
- [ ] Together AI (Llama 3.1 70B)

## 📝 Migration from V1

V1 chatbot has been archived to `src/components/ai-v1/`.

**Key Differences:**
- ✅ V2: Multi-provider with auto-fallback
- ✅ V2: Modern UI with gradient design
- ✅ V2: Provider metadata tracking
- ✅ V2: Cooldown & health monitoring
- ❌ V1: Single provider (Gemini only)
- ❌ V1: Step-by-step wizard (slow)
- ❌ V1: No fallback mechanism

## 🐛 Troubleshooting

### "All AI providers failed"
1. Check API keys in `.env.local`
2. Verify Groq/Gemini quota at console
3. Check terminal logs for specific errors

### Slow Response
- Groq should respond in <1s
- If slow, check network or Groq status

### Incorrect Parsing
- Fallback parser has lower accuracy (60%)
- Ensure Groq/Gemini are working for best results

---

**Last Updated**: 2026-02-05  
**Version**: 2.0  
**Author**: Money Flow 3 Team
