// src/components/GPUSettingsPanel.tsx

import { useState, useEffect } from 'react'
import { GPUDetector, Gemma3GPUOptimizer, GPU_CONFIGURATIONS } from '../config/gpu-optimization'
import { GPUOptimizedOllamaClient, SystemInfo } from '../lib/ollama-client-gpu-optimized'

interface GPUStatus {
  isOptimal: boolean
  warnings: string[]
  recommendations: string[]
  currentUsage: {
    vram: number
    utilization: number
  }
}

export function GPUSettingsPanel() {
  const [selectedGPU, setSelectedGPU] = useState<string>('default')
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [gpuStatus, setGPUStatus] = useState<GPUStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true)
  
  // 初期化
  useEffect(() => {
    initializeGPUSettings()
  }, [])
  
  const initializeGPUSettings = async () => {
    setIsLoading(true)
    
    try {
      // GPU自動検出
      if (autoDetectEnabled) {
        const detectedGPU = await GPUDetector.detectGPU()
        setSelectedGPU(detectedGPU)
      }
      
      // システム情報取得
      const client = new GPUOptimizedOllamaClient('http://localhost:11434', selectedGPU)
      const info = await client.getSystemInfo()
      setSystemInfo(info)
      
      // GPU状態評価
      await evaluateGPUStatus(selectedGPU)
      
    } catch (error) {
      console.error('GPU設定初期化エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // GPU状態の評価
  const evaluateGPUStatus = async (gpuId: string) => {
    const optimizer = new Gemma3GPUOptimizer(gpuId)
    const recommendations4b = optimizer.getRecommendations('4b')
    const recommendations12b = optimizer.getRecommendations('12b')
    
    const client = new GPUOptimizedOllamaClient('http://localhost:11434', gpuId)
    const validation = await client.validateOptimization()
    
    const status: GPUStatus = {
      isOptimal: validation.valid && recommendations4b.warnings.length === 0,
      warnings: [...recommendations4b.warnings, ...recommendations12b.warnings, ...validation.issues],
      recommendations: [...recommendations4b.suggestions, ...recommendations12b.suggestions, ...validation.recommendations],
      currentUsage: {
        vram: 0, // 実際の値は監視システムから取得
        utilization: 0
      }
    }
    
    setGPUStatus(status)
  }
  
  // GPU変更時の処理
  const handleGPUChange = async (gpuId: string) => {
    setSelectedGPU(gpuId)
    setAutoDetectEnabled(false)
    await evaluateGPUStatus(gpuId)
    
    // システム情報を再取得
    const client = new GPUOptimizedOllamaClient('http://localhost:11434', gpuId)
    const info = await client.getSystemInfo()
    setSystemInfo(info)
  }
  
  // 設定の適用
  const applyOptimization = async () => {
    try {
      const config = GPU_CONFIGURATIONS[selectedGPU]
      
      // 環境変数設定の表示
      const envVarsText = Object.entries(config.ollamaEnvVars)
        .map(([key, value]) => `export ${key}=${value}`)
        .join('\n')
      
      // クリップボードにコピー
      await navigator.clipboard.writeText(envVarsText)
      
      alert('環境変数設定をクリップボードにコピーしました。\nターミナルで実行してOllamaを再起動してください。')
      
    } catch (error) {
      console.error('設定適用エラー:', error)
      alert('設定の適用に失敗しました。')
    }
  }
  
  // モデルセットアップ
  const setupModels = async () => {
    const client = new GPUOptimizedOllamaClient('http://localhost:11434', selectedGPU)
    const modelStatus = await client.setupGemma3Models()
    
    const modelsToDownload = []
    if (modelStatus['4b'].setupRequired) modelsToDownload.push('gemma3:4b')
    if (modelStatus['12b'].setupRequired) modelsToDownload.push('gemma3:12b')
    
    if (modelsToDownload.length > 0) {
      const confirmed = confirm(`以下のモデルをダウンロードしますか？\n${modelsToDownload.join(', ')}`)
      if (confirmed) {
        for (const model of modelsToDownload) {
          console.log(`${model}をダウンロード中...`)
          await client.downloadModel(model, (progress) => {
            console.log(`${model}: ${progress.toFixed(1)}%`)
          })
        }
        alert('モデルのセットアップが完了しました。')
      }
    } else {
      alert('すべてのモデルが利用可能です。')
    }
  }
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* GPU選択 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">🖥️ GPU設定</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">GPU選択</label>
            <select
              value={selectedGPU}
              onChange={(e) => handleGPUChange(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {GPUDetector.getAvailableGPUs().map(gpu => (
                <option key={gpu.id} value={gpu.id}>
                  {gpu.name} ({gpu.vram}GB VRAM)
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoDetectEnabled}
                onChange={(e) => setAutoDetectEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">自動検出</span>
            </label>
          </div>
        </div>
        
        {/* 現在の設定表示 */}
        {systemInfo && (
          <div className="bg-gray-50 p-4 rounded mb-4">
            <h4 className="font-medium mb-2">現在の設定</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">GPU:</span> {systemInfo.gpu.config}
              </div>
              <div>
                <span className="text-gray-600">VRAM:</span> {systemInfo.gpu.vram}GB
              </div>
              <div>
                <span className="text-gray-600">Ollama:</span> 
                <span className={`ml-1 ${
                  systemInfo.ollama.status === 'connected' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {systemInfo.ollama.status}
                </span>
              </div>
              <div>
                <span className="text-gray-600">並列処理:</span> {systemInfo.gpu.recommendations.maxParallelModels}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* パフォーマンス予測 */}
      {systemInfo && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">⚡ パフォーマンス予測</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 4Bモデル */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Gemma3 4B</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>速度:</span>
                  <span className="font-mono">{systemInfo.performance.estimatedTPS['gemma3:4b']} tokens/s</span>
                </div>
                <div className="flex justify-between">
                  <span>メモリ:</span>
                  <span className="font-mono">{systemInfo.performance.memoryUsage['gemma3:4b']}GB</span>
                </div>
                <div className="flex justify-between">
                  <span>応答時間:</span>
                  <span className="font-mono">~{Math.round(50 / (systemInfo.performance.estimatedTPS['gemma3:4b'] || 1) * 1000)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>推奨用途:</span>
                  <span className="text-green-600">高速対話</span>
                </div>
              </div>
            </div>
            
            {/* 12Bモデル */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Gemma3 12B</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>速度:</span>
                  <span className="font-mono">{systemInfo.performance.estimatedTPS['gemma3:12b']} tokens/s</span>
                </div>
                <div className="flex justify-between">
                  <span>メモリ:</span>
                  <span className="font-mono">{systemInfo.performance.memoryUsage['gemma3:12b']}GB</span>
                </div>
                <div className="flex justify-between">
                  <span>応答時間:</span>
                  <span className="font-mono">~{Math.round(50 / (systemInfo.performance.estimatedTPS['gemma3:12b'] || 1) * 1000)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>推奨用途:</span>
                  <span className="text-blue-600">高品質対話</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 状態とアラート */}
      {gpuStatus && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📊 システム状態</h3>
          
          {/* 状態インジケーター */}
          <div className={`p-4 rounded-lg mb-4 ${
            gpuStatus.isOptimal 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                gpuStatus.isOptimal ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className="font-medium">
                {gpuStatus.isOptimal ? '最適化済み' : '調整が必要'}
              </span>
            </div>
          </div>
          
          {/* 警告 */}
          {gpuStatus.warnings.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-700 mb-2">⚠️ 警告</h4>
              <ul className="space-y-1">
                {gpuStatus.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-red-600">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 推奨事項 */}
          {gpuStatus.recommendations.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-blue-700 mb-2">💡 推奨事項</h4>
              <ul className="space-y-1">
                {gpuStatus.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-blue-600">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* アクションボタン */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">🛠️ 設定管理</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={applyOptimization}
            className="bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            最適化設定を適用
          </button>
          
          <button
            onClick={setupModels}
            className="bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 transition-colors"
          >
            モデルセットアップ
          </button>
          
          <button
            onClick={initializeGPUSettings}
            className="bg-gray-600 text-white py-3 px-4 rounded hover:bg-gray-700 transition-colors"
          >
            設定を再読み込み
          </button>
        </div>
        
        {/* セットアップガイドリンク */}
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">📋 詳細設定</h4>
          <p className="text-sm text-gray-600 mb-2">
            完全な最適化にはシステムレベルの設定が必要です。
          </p>
          <a 
            href="/docs/setup-guide" 
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            → 詳細セットアップガイドを見る
          </a>
        </div>
      </div>
      
      {/* デバッグ情報 */}
      {process.env.NODE_ENV === 'development' && systemInfo && (
        <div className="bg-gray-100 p-4 rounded">
          <details>
            <summary className="cursor-pointer font-medium">🔍 デバッグ情報</summary>
            <pre className="mt-2 text-xs overflow-x-auto">
              {JSON.stringify(systemInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}