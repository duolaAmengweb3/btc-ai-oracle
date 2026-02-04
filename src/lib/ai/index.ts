import { callDeepseek } from './deepseek';
import { callGemini } from './gemini';
import { callXAI } from './xai';
import { aggregatePredictions, AIResult, AggregatedPrediction } from './aggregator';
import { FullMarketContext } from './prompt';

export { aggregatePredictions, type AggregatedPrediction, type AIResult } from './aggregator';
export { type FullMarketContext } from './prompt';

// 并行调用所有AI
export async function callAllAIs(context: FullMarketContext): Promise<AIResult[]> {
  const startTime = Date.now();
  console.log('Starting AI calls...');

  const results = await Promise.allSettled([
    callDeepseek(context).then(r => ({ ...r, name: 'Deepseek' })),
    callGemini(context).then(r => ({ ...r, name: 'Gemini' })),
    callXAI(context).then(r => ({ ...r, name: 'XAI' })),
  ]);

  const aiResults: AIResult[] = results.map((result, index) => {
    const names = ['Deepseek', 'Gemini', 'XAI'];
    if (result.status === 'fulfilled') {
      return result.value as AIResult;
    } else {
      return {
        name: names[index],
        success: false,
        data: null,
        raw: '',
        error: result.reason?.message || 'Unknown error',
      };
    }
  });

  const elapsed = Date.now() - startTime;
  const successCount = aiResults.filter(r => r.success).length;
  console.log(`AI calls completed in ${elapsed}ms. Success: ${successCount}/3`);

  return aiResults;
}

// 生成完整预测
export async function generatePrediction(context: FullMarketContext): Promise<{
  aggregated: AggregatedPrediction;
  aiResults: AIResult[];
  successCount: number;
}> {
  const aiResults = await callAllAIs(context);
  const successCount = aiResults.filter(r => r.success).length;

  if (successCount === 0) {
    throw new Error('All AI calls failed');
  }

  const aggregated = aggregatePredictions(aiResults);

  return {
    aggregated,
    aiResults,
    successCount,
  };
}
