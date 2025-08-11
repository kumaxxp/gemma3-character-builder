// src/lib/ollama-client-gpu-optimized.ts

import { GPUDetector, Gemma3GPUOptimizer, GPU_CONFIGURATIONS } from '../config/gpu-optimization'

export interface SystemInfo {
  gpu: {
    detected: string
    config: string
    vram: number
    recommendations: any
  }
  ollama: {
    version?: string
    status: 'connected' | 'disconnected' | 'error'
    loadedModels: string[]
  }
  performance: {
    estimatedTPS: Record<string, number>
    memoryUsage: Record<string, number>
  }
}

export class GPUOptimizedOllamaClient {
  private baseUrl: string
  private gpuOptimizer: Gemma3GPUOptimizer
  private gpuId: string
  
  constructor(baseUrl: string = 'http://localhost:11434', gpuId?: string) {
    this.baseUrl = baseUrl
    this.gpuId = gpuId || 'default'
    this.gpuOptimizer = new Gemma3GPUOptimizer(this.gpuId)
  }
  
  // GPU最適化設定でクライアントを初期化
  static async createOptimized(baseUrl?: string): Promise<GPUOptimizedOllamaClient> {
    const detectedGPU = await GPUDetector.detectGPU()
    console.log(`検出されたGPU: ${GPU_CONFIGURATIONS[detectedGPU].name}`)
    
    return new GPUOptimizedOllamaClient(baseUrl, detectedGPU)
  }
  
  // システム情報の取得
  async getSystemInfo(): Promise<SystemInfo> {
    const systemInfo: SystemInfo = {
      gpu: {
        detected: this.gpuId,
        config: GPU_CONFIGURATIONS[this.gpuId].name,
        vram: GPU_CONFIGURATIONS[this.gpuId].vram,
        recommendations: GPU_CONFIGURATIONS[this.gpuId].recommendations
      },
      ollama: {
        status: 'disconnected',
        loadedModels: []
      },
      performance: {
        estimatedTPS: {},
        memoryUsage: {}
      }
    }
    
    try {
      // Ollama接続確認
      const versionResponse = await fetch(`${this.baseUrl}/api/version`)
      if (versionResponse.ok) {
        const versionData = await versionResponse.json()
        systemInfo.ollama.version = versionData.version
        systemInfo.ollama.status = 'connected'
      }
      
      // ロード済みモデル確認
      const psResponse = await fetch(`${this.baseUrl}/api/ps`)
      if (psResponse.ok) {
        const psData = await psResponse.json()
        systemInfo.ollama.loadedModels = psData.models?.map((m: any) => m.name) || []
      }
      
      // パフォーマンス推定
      systemInfo.performance = this.estimatePerformance()
      
    } catch (error) {
      systemInfo.ollama.status = 'error'
      console.error('システム情報取得エラー:', error)
    }
    
    return systemInfo
  }
  
  // GPU最適化された生成リクエスト
  async generateOptimized(
    model: string,
    prompt: string,
    modelSize: '4b' | '12b',
    customOptions: any = {}
  ) {
    const optimalConfig = this.gpuOptimizer.getOptimalConfig(modelSize)
    const finalOptions = { ...optimalConfig.ollamaOptions, ...customOptions }
    
    // メモリ使用量チェック
    const memUsage = this.gpuOptimizer.estimateVRAMUsage(modelSize, finalOptions.num_ctx)
    if (!memUsage.isWithinLimits) {
      console.warn(`VRAM使用量警告: ${memUsage.total.toFixed(1)}GB (制限: ${GPU_CONFIGURATIONS[this.gpuId].vram}GB)`)
    }
    
    try {
      const startTime = Date.now()
      
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const responseTime = Date.now() - startTime
      
      // パフォーマンス情報を追加
      return {
        ...data,
        performance: {
          responseTime,
          tokensPerSecond: data.eval_count ? (data.eval_count / (responseTime / 1000)) : 0,
          memoryEstimate: memUsage.total,
          gpuUtilization: this.estimateGPUUtilization(modelSize)
        },
        gpuOptimization: {
          applied: true,
          config: this.gpuId,
          settings: finalOptions
        }
      }
    } catch (error) {
      console.error('GPU最適化生成エラー:', error)
      throw error
    }
  }
  
  // パフォーマンス推定
  private estimatePerformance(): SystemInfo['performance'] {
    const gpuConfig = GPU_CONFIGURATIONS[this.gpuId]
    
    // GPU性能に基づくTPS推定
    const baselineMultiplier = {
      'rtx_a5000': 1.0,
      'rtx_4090': 1.2,
      'rtx_3090': 0.8,
      'default': 0.5
    }
    
    const multiplier = baselineMultiplier[this.gpuId as keyof typeof baselineMultiplier] || 0.5
    
    return {
      estimatedTPS: {
        'gemma3:4b': Math.round(90 * multiplier),
        'gemma3:12b': Math.round(35 * multiplier)
      },
      memoryUsage: {
        'gemma3:4b': 2.6,
        'gemma3:12b': 7.2
      }
    }
  }
  
  // GPU使用率推定
  private estimateGPUUtilization(modelSize: '4b' | '12b'): number {
    const gpuConfig = GPU_CONFIGURATIONS[this.gpuId]
    const memUsage = this.gpuOptimizer.estimateVRAMUsage(modelSize)
    
    // VRAM使用率ベースの概算
    return Math.min((memUsage.total / gpuConfig.vram) * 100, 95)
  }
  
  // Gemma3モデルの自動セットアップ
  async setupGemma3Models(): Promise<{
    '4b': { available: boolean, setupRequired: boolean }
    '12b': { available: boolean, setupRequired: boolean }
  }> {
    const result = {
      '4b': { available: false, setupRequired: false },
      '12b': { available: false, setupRequired: false }
    }
    
    try {
      // 利用可能なモデル一覧を取得
      const tagsResponse = await fetch(`${this.baseUrl}/api/tags`)
      const tagsData = await tagsResponse.json()
      const availableModels = tagsData.models?.map((m: any) => m.name) || []
      
      // Gemma3モデルの確認
      result['4b'].available = availableModels.some(name => name.includes('gemma3:4b'))
      result['12b'].available = availableModels.some(name => name.includes('gemma3:12b'))
      
      result['4b'].setupRequired = !result['4b'].available
      result['12b'].setupRequired = !result['12b'].available
      
    } catch (error) {
      console.error('モデル確認エラー:', error)
    }
    
    return result
  }
  
  // モデルの自動ダウンロード
  async downloadModel(modelName: string, onProgress?: (progress: number) => void): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      })
      
      if (!response.ok) {
        throw new Error(`モデルダウンロードエラー: ${response.status}`)
      }
      
      // ストリーミングレスポンスで進捗を追跡
      const reader = response.body?.getReader()
      if (!reader) throw new Error('ストリーミングレスポンスを取得できません')
      
      const decoder = new TextDecoder()
      let totalSize = 0
      let downloadedSize = 0
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            
            if (data.total) {
              totalSize = data.total
            }
            if (data.completed) {
              downloadedSize = data.completed
            }
            if (totalSize > 0 && onProgress) {
              onProgress((downloadedSize / totalSize) * 100)
            }
            if (data.status === 'success') {
              return true
            }
          } catch (e) {
            // JSON解析エラーは無視
          }
        }
      }
      
      return true
    } catch (error) {
      console.error('モデルダウンロードエラー:', error)
      return false
    }
  }
  
  // 最適化設定の適用確認
  async validateOptimization(): Promise<{
    valid: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues = []
    const recommendations = []
    
    try {
      // 環境変数の確認
      const envVars = GPU_CONFIGURATIONS[this.gpuId].ollamaEnvVars
      
      // システム情報で間接的に確認
      const systemInfo = await this.getSystemInfo()
      
      if (systemInfo.ollama.status !== 'connected') {
        issues.push('Ollamaに接続できません')
        recommendations.push('Ollamaが起動していることを確認してください')
      }
      
      // GPU最適化の推奨事項
      const gpuRec = this.gpuOptimizer.getRecommendations('4b')
      recommendations.push(...gpuRec.suggestions)
      
      if (gpuRec.warnings.length > 0) {
        issues.push(...gpuRec.warnings)
      }
      
    } catch (error) {
      issues.push('最適化設定の検証中にエラーが発生しました')
    }
    
    return {
      valid: issues.length === 0,
      issues,
      recommendations
    }
  }
}