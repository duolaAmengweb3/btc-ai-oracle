import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { buildPredictionPrompt, parseAIResponse, AIPredictionResponse, FullMarketContext } from './prompt';

function getProxyDispatcher() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxy && process.env.NODE_ENV !== 'production') {
    return new ProxyAgent(proxy);
  }
  return undefined;
}

export async function callGemini(context: FullMarketContext): Promise<{
  success: boolean;
  data: AIPredictionResponse | null;
  raw: string;
  error?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, data: null, raw: '', error: 'GEMINI_API_KEY not set' };
  }

  const prompt = buildPredictionPrompt(context);
  const dispatcher = getProxyDispatcher();

  const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await undiciFetch(GEMINI_API, {
      method: 'POST',
      dispatcher,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `你是一个专业的加密货币市场分析师，擅长基于数据进行短期市场预测。请严格按照要求的JSON格式输出。\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, data: null, raw: errorText, error: `API error: ${response.status}` };
    }

    const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const parsed = parseAIResponse(content);

    return {
      success: parsed !== null,
      data: parsed,
      raw: content,
      error: parsed === null ? 'Failed to parse response' : undefined,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      raw: '',
      error: `Request failed: ${error}`,
    };
  }
}
