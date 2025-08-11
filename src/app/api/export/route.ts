// src/app/api/export/route.ts

export async function POST(req: Request) {
  const character: Gemma3Character = await req.json()
  
  // 本体プログラム互換形式
  const exportData = {
    version: '2.0.0',  // Gemma3対応版
    metadata: {
      createdAt: new Date().toISOString(),
      builderVersion: 'gemma3-optimized',
      modelInfo: {
        name: `gemma3:${character.modelSize}`,
        contextWindow: character.modelSize === '4b' ? 8192 : 16384,
        recommendedTokens: character.modelSize === '4b' ? 100 : 150
      }
    },
    
    // 本体のAgentConfig互換
    agentConfig: {
      name: character.name,
      provider: 'Ollama',
      model: `gemma3:${character.modelSize}`,
      endpoint: character.ollamaConfig.endpoint || 'http://localhost:11434/v1',
      
      // Gemma3最適化済みパラメータ
      temperature: 1.0,
      top_p: 0.95,
      max_tokens: character.ollamaConfig.max_tokens,
      repetition_penalty: 1.0,  // 重要：1.0固定
      
      // プロンプト（Gemma3形式）
      promptSystem: '', // 使用しない
      promptStyle: character.promptTemplate,
      
      // デフォルト値
      failover: 'OFF',
      timeout_s: 30,
      min_tps: character.modelSize === '4b' ? 90 : 35
    },
    
    // キャラクター詳細
    characterData: character,
    
    // Modelfile（Ollama用）
    modelfile: OllamaGemma3Client.generateModelfile(character)
  }
  
  return Response.json(exportData)
}