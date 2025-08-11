// src/types/character.ts

export interface Gemma3Character {
  // 基本情報
  id: string
  name: string
  role: 'boke' | 'tsukkomi'
  modelSize: '4b' | '12b'  // Gemma3のモデルサイズ
  
  // キャラクター設定（シンプル化）
  personality: {
    core: string           // 1-2文での核となる性格
    traits: string[]       // 最大3つの特徴
  }
  
  // 話し方（具体例重視）
  speechStyle: {
    tone: 'casual' | 'polite' | 'friendly'
    sentenceEndings: string[]  // 「だよ」「です」など最大3つ
    examples: string[]          // 5-8個の発話例（Few-shot用）
    firstPerson: string        // 「僕」「私」「俺」
  }
  
  // Gemma3用プロンプト
  promptTemplate: string       // 自動生成されるプロンプト
  
  // Ollama設定（最適化済み）
  ollamaConfig: {
    endpoint: string
    model: string  // "gemma3:4b" or "gemma3:12b"
    temperature: number      // デフォルト1.0
    top_k: number           // デフォルト64
    top_p: number           // デフォルト0.95
    repeat_penalty: number  // 必ず1.0
    max_tokens: number      // 4b: 100, 12b: 150
    num_ctx: number        // 4b: 8192, 12b: 16384
  }
  
  // テスト結果
  testResults: {
    timestamp: number
    input: string
    output: string
    responseTime: number
    tokenCount: number
    qualityCheck: {
      lengthOK: boolean
      styleMatch: boolean
      characterConsistency: boolean
    }
  }[]
}