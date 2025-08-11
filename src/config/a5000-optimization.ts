// src/config/a5000-optimization.ts
// RTX A5000専用最適化設定

export const A5000_CONFIG = {
  // GPU基本情報
  gpu: {
    name: 'NVIDIA RTX A5000',
    vram: 24, // GB
    computeCapability: '8.6',
    cudaCores: 8192,
    memoryBandwidth: 768, // GB/s
    maxPowerDraw: 230 // W
  },
  
  // Ollama最適化設定
  ollamaSettings: {
    // 基本設定
    OLLAMA_NUM_PARALLEL: '2',
    OLLAMA_MAX_LOADED_MODELS: '3',
    OLLAMA_FLASH_ATTENTION: '1',
    OLLAMA_GPU_OVERHEAD: '2048',
    OLLAMA_MAX_VRAM: '22000', // 24GB - 2GB overhead
    
    // パフォーマンス設定
    OLLAMA_MAX_QUEUE: '4',
    OLLAMA_CONCURRENCY: '2',
    OLLAMA_KEEP_ALIVE: '5m',
    
    // デバッグ設定（開発時のみ）
    OLLAMA_DEBUG: process.env.NODE_ENV === 'development' ? '1' : '0',
    OLLAMA_LLM_LIBRARY: 'cuda',
    OLLAMA_VERBOSE: process.env.NODE_ENV === 'development' ? '1' : '0'
  },
  
  // Gemma3モデル別最適設定
  modelConfigs: {
    'gemma3:4b': {
      // 基本パラメータ
      temperature: 1.0,
      top_k: 64,
      top_p: 0.95,
      repeat_penalty: 1.0, // 必須：Gemma3では1.0固定
      
      // A5000最適化パラメータ
      num_ctx: 8192,      // コンテキストウィンドウ
      num_batch: 512,     // バッチサイズ
      num_thread: 8,      // スレッド数
      num_predict: 100,   // 最大トークン数
      
      // メモリ・GPU設定
      numa: false,
      low_vram: false,
      f16_kv: true,
      use_mlock: true,
      use_mmap: true,
      
      // 停止条件
      stop: ['<end_of_turn>', '<start_of_turn>'],
      
      // パフォーマンス期待値
      expectedPerformance: {
        tokensPerSecond: 110, // 平均値
        memoryUsage: 2.6,     // GB
        responseTime: 450,    // ms (50トークン)
        maxConcurrent: 9      // 理論値
      }
    },
    
    'gemma3:12b': {
      // 基本パラメータ
      temperature: 1.0,
      top_k: 64,
      top_p: 0.95,
      repeat_penalty: 1.0,
      
      // A5000最適化パラメータ
      num_ctx: 16384,     // 12Bはより大きなコンテキスト
      num_batch: 256,     // 小さめのバッチ
      num_thread: 12,     // より多くのスレッド
      num_predict: 150,   // より多くのトークン
      
      // メモリ・GPU設定
      numa: false,
      low_vram: false,
      f16_kv: true,
      use_mlock: true,
      use_mmap: true,
      
      // 停止条件
      stop: ['<end_of_turn>', '<start_of_turn>'],
      
      // パフォーマンス期待値
      expectedPerformance: {
        tokensPerSecond: 42,  // 平均値
        memoryUsage: 7.2,     // GB
        responseTime: 1200,   // ms (50トークン)
        maxConcurrent: 3      // 安全な同時実行数
      }
    }
  },
  
  // 使用状況別の推奨設定
  usageProfiles: {
    // 開発・テスト用
    development: {
      parallelModels: 1,
      keepAlive: '1m',
      debugMode: true,
      logLevel: 'verbose'
    },
    
    // デモ・プレゼン用
    demo: {
      parallelModels: 2,
      keepAlive: '5m',
      debugMode: false,
      logLevel: 'info',
      preferredModel: '4b' // 高速応答重視
    },
    
    // 本格運用用
    production: {
      parallelModels: 3,
      keepAlive: '10m',
      debugMode: false,
      logLevel: 'warn',
      preferredModel: '12b' // 品質重視
    }
  },
  
  // 監視設定
  monitoring: {
    gpuUtilizationThreshold: 85,   // %
    vramUsageThreshold: 20000,     // MB
    temperatureThreshold: 80,       // °C
    responseTimeThreshold: 3000,    // ms
    
    alertConditions: {
      highTemperature: 85,    // °C
      highVramUsage: 22000,   // MB
      slowResponse: 5000,     // ms
      lowThroughput: 20       // tokens/s
    }
  }
}

// パフォーマンス計算ユーティリティ
export class A5000PerformanceCalculator {
  
  // VRAM使用量の計算
  static calculateVramUsage(modelSize: '4b' | '12b', contextLength: number = 8192): {
    baseModel: number
    context: number
    total: number
    percentageUsed: number
    canFitModels: number
  } {
    const config = A5000_CONFIG.modelConfigs[`gemma3:${modelSize}`]
    const baseMemory = config.expectedPerformance.memoryUsage
    
    // コンテキスト長による追加メモリ（概算）
    const contextMemory = (contextLength / 1000) * 0.15 // 1000トークンあたり150MB
    
    const total = baseMemory + contextMemory
    const percentageUsed = (total / A5000_CONFIG.gpu.vram) * 100
    const canFitModels = Math.floor(A5000_CONFIG.gpu.vram / total)
    
    return {
      baseModel: baseMemory,
      context: contextMemory,
      total,
      percentageUsed,
      canFitModels
    }
  }
  
  // 期待パフォーマンスの計算
  static calculateExpectedPerformance(
    modelSize: '4b' | '12b',
    concurrentModels: number = 1
  ): {
    tokensPerSecond: number
    responseTime: number
    efficiency: number
  } {
    const config = A5000_CONFIG.modelConfigs[`gemma3:${modelSize}`]
    const basePerformance = config.expectedPerformance.tokensPerSecond
    
    // 並列実行による性能低下を考慮
    const parallelPenalty = Math.pow(0.8, concurrentModels - 1)
    const adjustedTPS = basePerformance * parallelPenalty
    
    // 50トークンの応答時間を計算
    const responseTime = (50 / adjustedTPS) * 1000
    
    // 効率性（理論値に対する実際の性能比）
    const efficiency = (adjustedTPS / basePerformance) * 100
    
    return {
      tokensPerSecond: Math.round(adjustedTPS),
      responseTime: Math.round(responseTime),
      efficiency: Math.round(efficiency)
    }
  }
  
  // 最適な設定の提案
  static getOptimalSettings(
    targetUse: 'development' | 'demo' | 'production',
    priorityModel: '4b' | '12b'
  ): {
    ollamaEnv: Record<string, string>
    modelConfig: any
    expectedPerformance: any
    warnings: string[]
  } {
    const profile = A5000_CONFIG.usageProfiles[targetUse]
    const modelConfig = A5000_CONFIG.modelConfigs[`gemma3:${priorityModel}`]
    
    const warnings = []
    
    // VRAM使用量チェック
    const vramUsage = this.calculateVramUsage(priorityModel)
    if (vramUsage.percentageUsed > 90) {
      warnings.push('VRAM使用率が90%を超えます。安定性に注意してください。')
    }
    
    // 並列処理チェック
    if (profile.parallelModels > vramUsage.canFitModels) {
      warnings.push('並列モデル数がVRAM制限を超えています。')
    }
    
    return {
      ollamaEnv: A5000_CONFIG.ollamaSettings,
      modelConfig,
      expectedPerformance: this.calculateExpectedPerformance(priorityModel, profile.parallelModels),
      warnings
    }
  }
  
  // システム状態の評価
  static evaluateSystemHealth(currentStats: {
    gpuUtil: number
    vramUsed: number
    temperature: number
    responseTime: number
  }): {
    overall: 'excellent' | 'good' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  } {
    const issues = []
    const recommendations = []
    const monitoring = A5000_CONFIG.monitoring
    
    // GPU使用率チェック
    if (currentStats.gpuUtil > monitoring.gpuUtilizationThreshold) {
      issues.push('GPU使用率が高すぎます')
      recommendations.push('並列処理数を削減してください')
    }
    
    // VRAM使用量チェック
    if (currentStats.vramUsed > monitoring.vramUsageThreshold) {
      issues.push('VRAM使用量が制限に近づいています')
      recommendations.push('コンテキスト長を短縮するか、モデル数を減らしてください')
    }
    
    // 温度チェック
    if (currentStats.temperature > monitoring.temperatureThreshold) {
      issues.push('GPU温度が高すぎます')
      recommendations.push('冷却を確認し、負荷を軽減してください')
    }
    
    // 応答時間チェック
    if (currentStats.responseTime > monitoring.responseTimeThreshold) {
      issues.push('応答時間が遅すぎます')
      recommendations.push('設定を見直すか、モデルサイズを変更してください')
    }
    
    // 総合評価
    let overall: 'excellent' | 'good' | 'warning' | 'critical'
    if (issues.length === 0) {
      overall = 'excellent'
    } else if (issues.length <= 1) {
      overall = 'good'
    } else if (issues.length <= 2) {
      overall = 'warning'
    } else {
      overall = 'critical'
    }
    
    return { overall, issues, recommendations }
  }
}

// クイックセットアップユーティリティ
export class A5000QuickSetup {
  
  // 環境変数設定コマンドの生成
  static generateEnvCommands(): string {
    const settings = A5000_CONFIG.ollamaSettings
    
    const commands = [
      '# RTX A5000 最適化設定',
      'sudo systemctl stop ollama',
      'sudo mkdir -p /etc/systemd/system/ollama.service.d',
      'sudo tee /etc/systemd/system/ollama.service.d/override.conf << EOF',
      '[Service]'
    ]
    
    Object.entries(settings).forEach(([key, value]) => {
      commands.push(`Environment="${key}=${value}"`)
    })
    
    commands.push(
      'EOF',
      'sudo systemctl daemon-reload',
      'sudo systemctl start ollama',
      'sudo systemctl status ollama'
    )
    
    return commands.join('\n')
  }
  
  // ベンチマークコマンドの生成
  static generateBenchmarkCommands(): string {
    return `
# A5000 パフォーマンステスト
echo "=== RTX A5000 + Gemma3 ベンチマーク ==="

# 1. GPU状態確認
nvidia-smi

# 2. 4Bモデル速度テスト
echo "4Bモデル速度テスト:"
time ollama run gemma3:4b "こんにちは、簡潔に挨拶してください"

# 3. 12Bモデル速度テスト（ある場合）
echo "12Bモデル速度テスト:"
time ollama run gemma3:12b "こんにちは、簡潔に挨拶してください"

# 4. 並列処理テスト
echo "並列処理テスト開始..."
for i in {1..2}; do
  ollama run gemma3:4b "テスト \$i: 短い返答をお願いします" &
done
wait

# 5. 最終GPU状態確認
echo "テスト完了後のGPU状態:"
nvidia-smi
`
  }
}