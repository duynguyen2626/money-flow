// DEFAULT_MODELS unused removed

interface ParsedBatchItem {
  account_number: string | null;
  receiver_name: string | null;
  bank_name: string | null;
  amount: number | null;
  note: string | null;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiResponse {
    candidates?: {
        content?: {
            parts?: { text: string }[];
        };
    }[];
}

const extractJson = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const codeFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeFence?.[1]) {
    return codeFence[1];
  }
  return trimmed;
};

const buildPrompt = (text: string) => {
  return [
    "You are a batch transfer parser. Extract transaction details from the input (image or text).",
    "Output strictly a JSON Array of objects.",
    "Fields per object: account_number (string), receiver_name (string), bank_name (string), amount (number), note (string).",
    "If a field is missing, use null.",
    "For bank_name, try to extract the full bank name or code (e.g. VCB, MB, Vietcombank).",
    "For note, valid transaction content usually includes 'CK', 'Chuyen tien', descriptions.",
    "Input text (if any):",
    text
  ].join("\n");
};

const callGemini = async (model: string, apiKey: string, prompt: string, imageBase64?: string) => {
  const parts: GeminiPart[] = [{ text: prompt }];
  
  if (imageBase64) {
    // Remove header if present (data:image/jpeg;base64,)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    parts.push({
      inlineData: {
        mimeType: "image/jpeg", // Assuming JPEG for now, or detect? Gemini handles generic images usually.
        data: cleanBase64
      }
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 2048, // Higher token limit for list
          responseMimeType: "application/json" // Force JSON mode
        },
      }),
    },
  );

  if (!response.ok) {
    console.error("Gemini API Error:", await response.text());
    return null;
  }

  const data = (await response.json()) as GeminiResponse;
  const rawText = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    ?.join("");
  
  if (!rawText) return null;

  const jsonText = extractJson(rawText);
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("JSON Parse Error:", e, jsonText);
    return null;
  }
};

export async function parseBatch(
  text: string,
  imageBase64?: string
): Promise<ParsedBatchItem[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return [];
  }

  const configuredModel = process.env.GEMINI_MODEL ?? "auto";
  // Default to Flash for speed/cost, unless auto
  const model = configuredModel === "auto" ? "gemini-1.5-flash" : configuredModel;
  
  const prompt = buildPrompt(text);
  const result = await callGemini(model, apiKey, prompt, imageBase64);
  
  if (Array.isArray(result)) {
    return result.map(item => ({
      account_number: item.account_number ? String(item.account_number) : null,
      receiver_name: item.receiver_name ?? null,
      bank_name: item.bank_name ?? null,
      amount: typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount).replace(/\D/g, '')),
      note: item.note ?? null
    }));
  }
  
  return [];
}
