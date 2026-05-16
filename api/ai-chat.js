const DEFAULT_MODEL = "gemini-flash-lite-latest";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitBuckets = new Map();

const SYSTEM_PROMPT = [
  "You are a direct AI study tutor inside a shared study room.",
  "Check solutions clearly as correct, incorrect, or partially correct.",
  "Briefly explain the thinking mistake and give the next useful step.",
  "If an image or screenshot is included, analyze it concretely.",
  "Answer in English by default, short and study-focused."
].join(" ");

export async function handleAiChatBody(body, env = process.env) {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      status: 500,
      body: { error: "Gemini API key is missing. Set GEMINI_API_KEY in .env or Vercel." }
    };
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const image = body?.image;
  const cleanMessages = messages
    .filter((message) => message && typeof message.content === "string")
    .slice(-8)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      text: message.content.slice(0, 4000)
    }));

  if (!cleanMessages.length && !image?.data) {
    return {
      status: 400,
      body: { error: "Send a question or an image." }
    };
  }

  const contents = cleanMessages.map((message, index) => {
    const parts = [{ text: message.text || "Please check this." }];
    const isLastUser = index === cleanMessages.length - 1 && message.role === "user";

    if (isLastUser && image?.data && image?.mimeType) {
      parts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.data
        }
      });
    }

    return {
      role: message.role,
      parts
    };
  });

  if (!contents.length && image?.data && image?.mimeType) {
    contents.push({
      role: "user",
      parts: [
        { text: "Please check this screenshot or task and briefly explain whether the solution is correct." },
        {
          inline_data: {
            mime_type: image.mimeType,
            data: image.data
          }
        }
      ]
    });
  }

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const response = await fetchGemini(model, apiKey, contents);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      formatGeminiError(data?.error?.message, response.status, model) ||
      (response.status === 429
        ? "Gemini Free Tier limit reached. Try again later."
        : "Gemini could not answer right now.");

    return {
      status: response.status,
      body: { error: message }
    };
  }

  const answer =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim() || "I could not generate an answer.";

  return {
    status: 200,
    body: { answer }
  };
}

export function checkAiRateLimit(clientId = "anonymous") {
  const now = Date.now();
  const bucketKey = String(clientId || "anonymous");
  const bucket = rateLimitBuckets.get(bucketKey);

  if (!bucket || now > bucket.resetAt) {
    cleanupRateLimitBuckets(now);
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - bucket.count
  };
}

function cleanupRateLimitBuckets(now) {
  if (rateLimitBuckets.size < 500) return;

  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (now > bucket.resetAt) {
      rateLimitBuckets.delete(key);
    }
  }
}

function getClientId(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || realIp || req.socket?.remoteAddress;

  return String(ip || "anonymous")
    .split(",")[0]
    .trim();
}

function fetchGemini(model, apiKey, contents) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents,
      generation_config: {
        temperature: 0.35,
        max_output_tokens: 520
      }
    })
  });
}

function formatGeminiError(message, status, model) {
  if (!message) return "";

  if (status === 429 || message.toLowerCase().includes("quota")) {
    return `Gemini Free Tier limit reached or ${model} is not active. Check your project/quota in Google AI Studio or use another Gemini key.`;
  }

  if (message.toLowerCase().includes("api key not valid")) {
    return "The Gemini API key is invalid. Copy the key again from Google AI Studio.";
  }

  return message.slice(0, 260);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const rateLimit = checkAiRateLimit(getClientId(req));

    if (!rateLimit.allowed) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({
        error: "AI request limit reached. Try again later."
      });
      return;
    }

    const result = await handleAiChatBody(req.body);
    res.status(result.status).json(result.body);
  } catch {
    res.status(500).json({ error: "AI Tutor is not reachable right now." });
  }
}

