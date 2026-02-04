import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { buildPredictionPrompt, parseAIResponse, AIPredictionResponse, FullMarketContext } from './prompt';

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

function getProxyDispatcher() {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxy && process.env.NODE_ENV !== 'production') {
    return new ProxyAgent(proxy);
  }
  return undefined;
}

export async function callDeepseek(context: FullMarketContext): Promise<{
  success: boolean;
  data: AIPredictionResponse | null;
  raw: string;
  error?: string;
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return { success: false, data: null, raw: '', error: 'DEEPSEEK_API_KEY not set' };
  }

  const prompt = buildPredictionPrompt(context);
  const dispatcher = getProxyDispatcher();

  try {
    const response = await undiciFetch(DEEPSEEK_API, {
      method: 'POST',
      dispatcher,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的加密货币市场分析师，擅长基于数据进行短期市场预测。请严格按照要求的JSON格式输出。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, data: null, raw: errorText, error: `API error: ${response.status}` };
    }

    const result = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = result.choices?.[0]?.message?.content || '';

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
