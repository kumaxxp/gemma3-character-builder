// src/lib/ollama-client.ts

export class OllamaGemma3Client {
  // モデルサイズ別の最適設定
  static getOptimalConfig(modelSize: '4b' | '12b'): Partial<OllamaConfig> {
    const baseConfig = {
      temperature: 1.0,
      top_k: 64,
      top_p: 0.95,
      repeat_penalty: 1.0,  // Gemma3では必須
      min_p: 0.01,
      stop: ['<end_of_turn>', '<start_of_turn>']
    }
    
    if (modelSize === '4b') {
      return {
        ...baseConfig,
        num_ctx: 8192,
        num_batch: 512,
        num_predict: 100,
        num_thread: 8
      }
    } else {
      return {
        ...baseConfig,
        num_ctx: 16384,
        num_batch: 256,
        num_predict: 150,
        num_thread: 12
      }
    }
  }
  
  // Modelfile生成
  static generateModelfile(character: Gemma3Character): string {
    const config = this.getOptimalConfig(character.modelSize)
    
    return `
FROM gemma3:${character.modelSize}
PARAMETER temperature ${config.temperature}
PARAMETER top_k ${config.top_k}
PARAMETER top_p ${config.top_p}
PARAMETER repeat_penalty ${config.repeat_penalty}
PARAMETER num_ctx ${config.num_ctx}
PARAMETER stop "<end_of_turn>"

# キャラクター: ${character.name}
# 注意: Gemma3はシステムロールをサポートしません
# すべての指示はユーザープロンプトに含めてください
`
  }
}