// src/lib/ollama-client-enhanced.ts

export interface OllamaResponse {
  response: string
  eval_count: number
  eval_duration: number
  load_duration: number
  prompt_eval_count: number
  prompt_eval_duration: number
  total_duration: number
}

export interface ConnectionStatus {
  connected: boolean
  version?: string
  availableModels: string[]
  error?: string
}

export class EnhancedOllamaClient {
  private baseUrl: string
  
  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl
  }
  
  // 接続テストとモデル確認
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      // Ollamaの稼働確認
      const versionResponse = await fetch(`${this.baseUrl}/api/version`)
      if (!versionResponse.ok) {
        throw new Error(`HTTP ${versionResponse.status}`)
      }
      
      const versionData = await versionResponse.json()
      
      // 利用可能なモデル一覧を取得
      const modelsResponse = await fetch(`${this.baseUrl}/api/tags`)
      const modelsData = await modelsResponse.json()
      
      const availableModels = modelsData.models?.map((m: any) => m.name) || []
      
      // Gemma3モデルの存在確認
      const gemma3Models = availableModels.filter((name: string) => 
        name.includes('gemma3')
      )
      
      if (gemma3Models.length === 0) {
        console.warn('Gemma3モデルが見つかりません。ollama pull gemma3:4b を実行してください。')
      }
      
      return {
        connected: true,
        version: versionData.version,
        availableModels: gemma3Models,
      }
    } catch (error) {
      return {
        connected: false,
        availableModels: [],
        error: error instanceof Error ? error.message : '不明なエラー'
      }
    }
  }
  
  // Gemma3専用の生成リクエスト
  async generateWithGemma3(
    model: string,
    prompt: string,
    options: {
      temperature?: number
      top_k?: number
      top_p?: number
      repeat_penalty?: number
      num_predict?: number
      stream?: boolean
    } = {}
  ): Promise<OllamaResponse> {
    // Gemma3最適化済みデフォルト設定
    const defaultOptions = {
      temperature: 1.0,
      top_k: 64,
      top_p: 0.95,
      repeat_penalty: 1.0,  // 必須：Gemma3では1.0固定
      num_predict: model.includes('4b') ? 100 : 150,
      stream: false,
      stop: ['<end_of_turn>', '<start_of_turn>']
    }
    
    const finalOptions = { ...defaultOptions, ...options }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          options: finalOptions
        })
      })
      
      if (!response.ok) {
        throw new Error(`Ollama API エラー: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // レスポンスの品質チェック
      this.validateGemma3Response(data.response)
      
      return data
    } catch (error) {
      console.error('Gemma3生成エラー:', error)
      throw error
    }
  }
  
  // ストリーミング生成（リアルタイムテスト用）
  async generateStreamWithGemma3(
    model: string,
    prompt: string,
    onChunk: (chunk: string) => void,
    options: any = {}
  ): Promise<string> {
    const defaultOptions = {
      temperature: 1.0,
      top_k: 64,
      top_p: 0.95,
      repeat_penalty: 1.0,
      num_predict: model.includes('4b') ? 100 : 150,
      stream: true,
      stop: ['<end_of_turn>', '<start_of_turn>']
    }
    
    const finalOptions = { ...defaultOptions, ...options }
    let fullResponse = ''
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          options: finalOptions
        })
      })
      
      if (!response.ok) {
        throw new Error(`Ollama API エラー: ${response.status}`)
      }
      
      const reader = response.body?.getReader()
      if (!reader) throw new Error('ストリーミングレスポンスを取得できません')
      
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.response) {
              fullResponse += data.response
              onChunk(data.response)
            }
            if (data.done) {
              return fullResponse
            }
          } catch (e) {
            // JSON解析エラーは無視（部分的なチャンクの可能性）
          }
        }
      }
      
      return fullResponse
    } catch (error) {
      console.error('ストリーミング生成エラー:', error)
      throw error
    }
  }
  
  // Gemma3レスポンスの品質チェック
  private validateGemma3Response(response: string): void {
    const issues = []
    
    // タグ漏れチェック
    if (response.includes('<end_of_turn>') || response.includes('<start_of_turn>')) {
      issues.push('プロンプトタグが出力に含まれています')
    }
    
    // 長さチェック（日本語想定）
    if (response.length > 100) {
      issues.push('レスポンスが長すぎます（100文字超過）')
    }
    
    if (response.length < 5) {
      issues.push('レスポンスが短すぎます')
    }
    
    // 不完全な文のチェック
    if (!response.match(/[。！？]$/) && !response.match(/[だよね～]$/)) {
      issues.push('文が不完全な可能性があります')
    }
    
    if (issues.length > 0) {
      console.warn('Gemma3レスポンス品質の問題:', issues)
    }
  }
  
  // モデルの詳細情報を取得
  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName })
      })
      
      if (!response.ok) {
        throw new Error(`モデル情報取得エラー: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('モデル情報取得エラー:', error)
      throw error
    }
  }
  
  // パフォーマンス測定付きテスト
  async performanceTest(
    model: string,
    prompts: string[],
    iterations: number = 3
  ): Promise<{
    averageResponseTime: number
    averageTokensPerSecond: number
    memoryUsage?: number
    results: Array<{
      prompt: string
      responseTime: number
      tokenCount: number
      tokensPerSecond: number
    }>
  }> {
    const results = []
    
    for (const prompt of prompts) {
      let totalTime = 0
      let totalTokens = 0
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()
        const response = await this.generateWithGemma3(model, prompt)
        const endTime = Date.now()
        
        const responseTime = endTime - startTime
        const tokenCount = response.eval_count || 0
        
        totalTime += responseTime
        totalTokens += tokenCount
      }
      
      const avgTime = totalTime / iterations
      const avgTokens = totalTokens / iterations
      const tokensPerSecond = avgTokens / (avgTime / 1000)
      
      results.push({
        prompt: prompt.substring(0, 50) + '...',
        responseTime: avgTime,
        tokenCount: avgTokens,
        tokensPerSecond
      })
    }
    
    const overallAvgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
    const overallAvgTPS = results.reduce((sum, r) => sum + r.tokensPerSecond, 0) / results.length
    
    return {
      averageResponseTime: overallAvgTime,
      averageTokensPerSecond: overallAvgTPS,
      results
    }
  }
  
  // Gemma3用Modelfileの自動作成とデプロイ
  async createAndDeployCharacterModel(
    character: Gemma3Character,
    baseModel: string = 'gemma3:4b'
  ): Promise<string> {
    const modelName = `${character.name.toLowerCase()}-gemma3`
    
    const modelfile = this.generateCharacterModelfile(character, baseModel)
    
    try {
      const response = await fetch(`${this.baseUrl}/api/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          modelfile: modelfile
        })
      })
      
      if (!response.ok) {
        throw new Error(`モデル作成エラー: ${response.status}`)
      }
      
      return modelName
    } catch (error) {
      console.error('キャラクターモデル作成エラー:', error)
      throw error
    }
  }
  
  // キャラクター専用Modelfile生成
  private generateCharacterModelfile(character: Gemma3Character, baseModel: string): string {
    const config = character.modelSize === '4b' 
      ? { num_ctx: 8192, num_predict: 100 }
      : { num_ctx: 16384, num_predict: 150 }
    
    return `FROM ${baseModel}

# ${character.name} - ${character.role}キャラクター
PARAMETER temperature 1.0
PARAMETER top_k 64
PARAMETER top_p 0.95
PARAMETER repeat_penalty 1.0
PARAMETER num_ctx ${config.num_ctx}
PARAMETER num_predict ${config.num_predict}
PARAMETER stop "<end_of_turn>"
PARAMETER stop "<start_of_turn>"

# キャラクター情報
# 名前: ${character.name}
# 役割: ${character.role}
# 性格: ${character.personality.core}
# 話し方: ${character.speechStyle.sentenceEndings.join(', ')}
`
  }
}