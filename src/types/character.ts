// src/types/character.ts
// Gemma3キャラクター専用型定義

export interface Gemma3Character {
  // 基本情報
  id: string
  name: string
  role: 'boke' | 'tsukkomi'
  modelSize: '4b' | '12b'
  
  // 性格設定（Gemma3最適化）
  personality: {
    core: string           // 1-2文での核となる性格
    traits: string[]       // 最大3つの特徴
  }
  
  // 話し方（具体例重視）
  speechStyle: {
    tone: 'casual' | 'polite' | 'friendly'
    sentenceEndings: string[]  // 語尾（最大3つ）
    examples: string[]         // 発話例（Few-shot用）
    firstPerson: string       // 一人称
  }
  
  // 背景設定
  background: {
    origin: string          // 出身地
    occupation: string      // 職業
    age: string            // 年齢
    experiences: {
      category: 'positive' | 'negative' | 'neutral'
      brief: string         // 短い説明
      detail: string        // 詳細
      impact: string        // キャラへの影響
    }[]
  }
  
  // 得意・不得意
  abilities: {
    strengths: {
      area: string          // 得意分野
      level: 'expert' | 'good' | 'learning'
      specificSkills: string[]
      confidence: number    // 0-1
    }[]
    
    weaknesses: {
      area: string          // 苦手分野
      severity: 'mild' | 'moderate' | 'severe'
      reaction: string      // この話題での反応
      avoidance: boolean    // 話題を避けるか
    }[]
    
    interests: {
      topic: string
      enthusiasm: 'low' | 'medium' | 'high'
      knowledge: 'beginner' | 'intermediate' | 'expert'
    }[]
  }
  
  // 関係性設定
  relationships: {
    withUser: {
      closeness: 'stranger' | 'acquaintance' | 'friend' | 'close'
      history: string       // 関係の履歴
      tone: 'formal' | 'casual' | 'friendly'
    }
    
    withOtherCharacter?: {
      characterName: string
      relationship: string  // 関係性
      dynamic: string      // 力学
    }
  }
  
  // Gemma3用プロンプト
  promptTemplate: string       // 自動生成されるプロンプト
  
  // Ollama設定（最適化済み）
  ollamaConfig: {
    endpoint: string
    model: string            // "gemma3:4b" or "gemma3:12b"
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

// キャラクター作成時の部分型
export type PartialGemma3Character = Partial<Gemma3Character>

// モデル設定
export interface ModelConfig {
  name: string
  size: '4b' | '12b'
  memoryUsage: number     // GB
  expectedTPS: number     // tokens per second
  contextWindow: number   // tokens
  recommendedUse: string
}

// テスト結果型
export interface TestResult {
  input: string
  output: string
  responseTime: number
  scores: {
    characterConsistency: number  // 0-1
    lengthCompliance: number      // 0-1
    styleAccuracy: number        // 0-1
    responseQuality: number      // 0-1
    overall: number              // 0-1
  }
  issues: string[]
}

// システム状態型
export interface SystemStatus {
  gpu: {
    name: string
    vram: number
    temperature: number
    utilization: number
  }
  ollama: {
    connected: boolean
    version?: string
    loadedModels: string[]
  }
  performance: {
    currentTPS: number
    averageResponseTime: number
    memoryUsage: number
  }
}

// エクスポート設定型
export interface ExportConfig {
  version: string
  metadata: {
    createdAt: string
    builderVersion: string
    modelInfo: {
      name: string
      contextWindow: number
      recommendedTokens: number
    }
  }
  characterData: Gemma3Character
  agentConfig: {
    name: string
    provider: 'Ollama'
    model: string
    endpoint: string
    temperature: number
    top_p: number
    max_tokens: number
    repetition_penalty: number
    promptStyle: string
    failover: 'OFF'
    timeout_s: number
  }
  modelfile?: string
}

// プロンプトビルダー用型
export interface PromptBuildOptions {
  includeHistory: boolean
  maxHistoryLength: number
  includeExamples: boolean
  optimizeForModel: '4b' | '12b'
  contextFormat: 'gemma3' | 'standard'
}

// Gemma3固有の設定
export const GEMMA3_CONSTRAINTS = {
  // システムロール非対応
  SYSTEM_ROLE_SUPPORTED: false,
  
  // プロンプト形式
  PROMPT_FORMAT: {
    USER_START: '<start_of_turn>user',
    USER_END: '<end_of_turn>',
    MODEL_START: '<start_of_turn>model',
    MODEL_END: '<end_of_turn>'
  },
  
  // 推奨パラメータ
  RECOMMENDED_PARAMS: {
    temperature: 1.0,
    top_k: 64,
    top_p: 0.95,
    repeat_penalty: 1.0,  // 必須
    stop_sequences: ['<end_of_turn>', '<start_of_turn>']
  },
  
  // モデル別制限
  MODEL_LIMITS: {
    '4b': {
      max_traits: 1,
      max_strengths: 1,
      max_weaknesses: 1,
      recommended_context: 8192,
      recommended_tokens: 100
    },
    '12b': {
      max_traits: 3,
      max_strengths: 2,
      max_weaknesses: 2,
      recommended_context: 16384,
      recommended_tokens: 150
    }
  },
  
  // 日本語対応
  JAPANESE_OPTIMIZATION: {
    max_response_length: 50,  // 文字数
    min_response_length: 20,
    recommended_endings: ['だよ', 'です', 'だね', 'である'],
    first_person_options: ['僕', '私', '俺', 'わたし']
  }
} as const

// ユーティリティ型
export type ModelSize = '4b' | '12b'
export type CharacterRole = 'boke' | 'tsukkomi'
export type SpeechTone = 'casual' | 'polite' | 'friendly'
export type RelationshipCloseness = 'stranger' | 'acquaintance' | 'friend' | 'close'
export type EnthusiasmLevel = 'low' | 'medium' | 'high'
export type KnowledgeLevel = 'beginner' | 'intermediate' | 'expert'
export type SkillLevel = 'expert' | 'good' | 'learning'
export type WeaknessSeverity = 'mild' | 'moderate' | 'severe'

// バリデーション関数の型
export interface CharacterValidator {
  validateName: (name: string) => boolean
  validatePersonality: (personality: Gemma3Character['personality'], modelSize: ModelSize) => string[]
  validateSpeechStyle: (speechStyle: Gemma3Character['speechStyle']) => string[]
  validateBackground: (background: Gemma3Character['background'], modelSize: ModelSize) => string[]
  validateAbilities: (abilities: Gemma3Character['abilities'], modelSize: ModelSize) => string[]
  validateComplete: (character: Gemma3Character) => { valid: boolean; errors: string[] }
}