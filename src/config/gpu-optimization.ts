// src/config/gpu-optimization.ts

export interface GPUOptimizationConfig {
  name: string
  vram: number  // VRAM容量（GB）
  computeCapability: string
  recommendations: {
    maxParallelModels: number
    maxLoadedModels: number
    flashAttention: boolean
    numThreads: {
      '4b': number
      '12b': number
    }
    batchSizes: {
      '4b': number
      '12b': number
    }
    contextLimits: {
      '4b': number
      '12b': number
    }
  }
  ollamaEnvVars: Record<string, string>
}

// サポートするGPU設定
export const GPU_CONFIGURATIONS: Record<string, GPUOptimizationConfig> = {
  'rtx_a5000': {
    name: 'NVIDIA RTX A5000',
    vram: 24,
    computeCapability: '8.6',
    recommendations: {
      maxParallelModels: 2,
      maxLoadedModels: 3,
      flashAttention: true,
      numThreads: {
        '4b': 8,
        '12b': 12
      },
      batchSizes: {
        '4b': 512,
        '12b': 256
      },
      contextLimits: {
        '4b': 8192,
        '12b': 16384
      }
    },
    ollamaEnvVars: {
      'OLLAMA_NUM_PARALLEL': '2',
      'OLLAMA_MAX_LOADED_MODELS': '3',
      'OLLAMA_FLASH_ATTENTION': '1',
      'OLLAMA_GPU_OVERHEAD': '2048',
      'OLLAMA_MAX_VRAM': '22000'  // 24GB - 2GB overhead
    }
  },
  'rtx_4090': {
    name: 'NVIDIA RTX 4090',
    vram: 24,
    computeCapability: '8.9',
    recommendations: {
      maxParallelModels: 2,
      maxLoadedModels: 3,
      flashAttention: true,
      numThreads: {
        '4b': 8,
        '12b': 12
      },
      batchSizes: {
        '4b': 512,
        '12b': 256
      },
      contextLimits: {
        '4b': 8192,
        '12b': 16384
      }
    },
    ollamaEnvVars: {
      'OLLAMA_NUM_PARALLEL': '2',
      'OLLAMA_MAX_LOADED_MODELS': '3',
      'OLLAMA_FLASH_ATTENTION': '1',
      'OLLAMA_GPU_OVERHEAD': '2048',
      'OLLAMA_MAX_VRAM': '22000'
    }
  },
  'rtx_3090': {
    name: 'NVIDIA RTX 3090',
    vram: 24,
    computeCapability: '8.6',
    recommendations: {
      maxParallelModels: 2,
      maxLoadedModels: 2,
      flashAttention: false,  // 3090はFlash Attentionが不安定な場合あり
      numThreads: {
        '4b': 6,
        '12b': 10
      },
      batchSizes: {
        '4b': 256,
        '12b': 128
      },
      contextLimits: {
        '4b': 8192,
        '12b': 12288
      }
    },
    ollamaEnvVars: {
      'OLLAMA_NUM_PARALLEL': '2',
      'OLLAMA_MAX_LOADED_MODELS': '2',
      'OLLAMA_FLASH_ATTENTION': '0',
      'OLLAMA_GPU_OVERHEAD': '2048',
      'OLLAMA_MAX_VRAM': '22000'
    }
  },
  'default': {
    name: 'その他のGPU',
    vram: 8,
    computeCapability: '7.5',
    recommendations: {
      maxParallelModels: 1,
      maxLoadedModels: 1,
      flashAttention: false,
      numThreads: {
        '4b': 4,
        '12b': 6
      },
      batchSizes: {
        '4b': 256,
        '12b': 128
      },
      contextLimits: {
        '4b': 4096,
        '12b': 8192
      }
    },
    ollamaEnvVars: {
      'OLLAMA_NUM_PARALLEL': '1',
      'OLLAMA_MAX_LOADED_MODELS': '1',
      'OLLAMA_FLASH_ATTENTION': '0',
      'OLLAMA_GPU_OVERHEAD': '1024'
    }
  }
}

// GPU自動検出機能
export class GPUDetector {
  // GPU情報の取得（ブラウザ環境では制限あり）
  static async detectGPU(): Promise<string> {
    try {
      // WebGL経由でGPU情報を取得
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          
          // GPUモデルの推定
          if (renderer.includes('RTX A5000') || renderer.includes('A5000')) {
            return 'rtx_a5000'
          } else if (renderer.includes('RTX 4090') || renderer.includes('4090')) {
            return 'rtx_4090'
          } else if (renderer.includes('RTX 3090') || renderer.includes('3090')) {
            return 'rtx_3090'
          }
        }
      }
    } catch (error) {
      console.warn('GPU検出に失敗しました:', error)
    }
    
    return 'default'
  }
  
  // ユーザー選択式GPU設定
  static getAvailableGPUs(): Array<{id: string, name: string, vram: number}> {
    return Object.entries(GPU_CONFIGURATIONS).map(([id, config]) => ({
      id,
      name: config.name,
      vram: config.vram
    }))
  }
}

// Gemma3特化型最適化設定
export class Gemma3GPUOptimizer {
  private gpuConfig: GPUOptimizationConfig
  
  constructor(gpuId: string = 'default') {
    this.gpuConfig = GPU_CONFIGURATIONS[gpuId] || GPU_CONFIGURATIONS.default
  }
  
  // モデルサイズとGPUに応じた最適設定を生成
  getOptimalConfig(modelSize: '4b' | '12b'): {
    ollamaOptions: Record<string, any>
    modelLimitations: {
      maxConcurrentChats: number
      recommendedMaxTokens: number
      warningThreshold: number
    }
  } {
    const rec = this.gpuConfig.recommendations
    
    return {
      ollamaOptions: {
        temperature: 1.0,
        top_k: 64,
        top_p: 0.95,
        repeat_penalty: 1.0,
        num_ctx: rec.contextLimits[modelSize],
        num_batch: rec.batchSizes[modelSize],
        num_thread: rec.numThreads[modelSize],
        num_predict: modelSize === '4b' ? 100 : 150,
        stop: ['<end_of_turn>', '<start_of_turn>']
      },
      modelLimitations: {
        maxConcurrentChats: rec.maxParallelModels,
        recommendedMaxTokens: modelSize === '4b' ? 100 : 150,
        warningThreshold: this.gpuConfig.vram * 0.8  // VRAM使用量警告閾値
      }
    }
  }
  
  // メモリ使用量の推定
  estimateVRAMUsage(modelSize: '4b' | '12b', contextLength: number = 8192): {
    baseModel: number
    context: number
    total: number
    isWithinLimits: boolean
  } {
    // モデルサイズ別のベースメモリ使用量（INT4量子化想定）
    const baseMemory = {
      '4b': 2.6,   // GB
      '12b': 7.2   // GB
    }
    
    // コンテキスト長によるメモリ増加（概算）
    const contextMemory = (contextLength / 1000) * 0.1  // 1000トークンあたり100MB
    
    const total = baseMemory[modelSize] + contextMemory
    
    return {
      baseModel: baseMemory[modelSize],
      context: contextMemory,
      total,
      isWithinLimits: total < this.gpuConfig.vram * 0.9
    }
  }
  
  // 推奨設定の取得
  getRecommendations(modelSize: '4b' | '12b'): {
    summary: string
    warnings: string[]
    suggestions: string[]
  } {
    const config = this.getOptimalConfig(modelSize)
    const memUsage = this.estimateVRAMUsage(modelSize)
    
    const warnings = []
    const suggestions = []
    
    if (!memUsage.isWithinLimits) {
      warnings.push(`VRAM使用量が制限を超える可能性があります（推定${memUsage.total.toFixed(1)}GB）`)
      suggestions.push('コンテキスト長を短くすることを検討してください')
    }
    
    if (modelSize === '12b' && this.gpuConfig.vram < 16) {
      warnings.push('VRAM不足により12Bモデルの性能が制限される可能性があります')
      suggestions.push('4Bモデルの使用を推奨します')
    }
    
    return {
      summary: `${this.gpuConfig.name}向けに最適化済み（並列処理: ${this.gpuConfig.recommendations.maxParallelModels}、スレッド数: ${this.gpuConfig.recommendations.numThreads[modelSize]}）`,
      warnings,
      suggestions
    }
  }
}