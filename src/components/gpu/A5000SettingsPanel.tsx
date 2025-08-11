// src/components/gpu/A5000SettingsPanel.tsx

import { useState, useEffect } from 'react'
import { A5000_CONFIG, A5000PerformanceCalculator, A5000QuickSetup } from '../../config/a5000-optimization'

interface A5000Status {
  isOptimized: boolean
  currentPerformance: {
    tokensPerSecond: number
    responseTime: number
    efficiency: number
  }
  systemHealth: {
    overall: 'excellent' | 'good' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  }
  gpuStats: {
    utilization: number
    vramUsed: number
    temperature: number
  }
}

export function A5000SettingsPanel() {
  const [selectedModel, setSelectedModel] = useState<'4b' | '12b'>('4b')
  const [selectedProfile, setSelectedProfile] = useState<'development' | 'demo' | 'production'>('demo')
  const [a5000Status, setA5000Status] = useState<A5000Status | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [setupCommands, setSetupCommands] = useState('')
  
  useEffect(() => {
    initializeA5000Status()
    generateSetupCommands()
  }, [selectedModel, selectedProfile])
  
  const initializeA5000Status = async () => {
    setIsLoading(true)
    
    try {
      // パフォーマンス計算
      const performance = A5000PerformanceCalculator.calculateExpectedPerformance(
        selectedModel,
        A5000_CONFIG.usageProfiles[selectedProfile].parallelModels
      )
      
      // システム状態をシミュレート（実際の実装では監視APIから取得）
      const mockGpuStats = {
        utilization: 25, // %
        vramUsed: selectedModel === '4b' ? 2600 : 7200, // MB
        temperature: 35 // °C
      }
      
      const systemHealth = A5000PerformanceCalculator.evaluateSystemHealth({
        gpuUtil: mockGpuStats.utilization,
        vramUsed: mockGpuStats.vramUsed,
        temperature: mockGpuStats.temperature,
        responseTime: performance.responseTime
      })
      
      setA5000Status({
        isOptimized: true, // 実際の実装では設定チェック
        currentPerformance: performance,
        systemHealth,
        gpuStats: mockGpuStats
      })
      
    } catch (error) {
      console.error('A5000状態初期化エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const generateSetupCommands = () => {
    const commands = A5000QuickSetup.generateEnvCommands()
    setSetupCommands(commands)
  }
  
  const copySetupCommands = async () => {
    try {
      await navigator.clipboard.writeText(setupCommands)
      alert('セットアップコマンドをクリップボードにコピーしました！\nターミナルで実行してください。')
    } catch (error) {
      console.error('コピーエラー:', error)
      alert('コピーに失敗しました。手動でコマンドを選択してコピーしてください。')
    }
  }
  
  const runPerformanceTest = async () => {
    const benchmarkCommands = A5000QuickSetup.generateBenchmarkCommands()
    try {
      await navigator.clipboard.writeText(benchmarkCommands)
      alert('ベンチマークコマンドをクリップボードにコピーしました！\nターミナルで実行して性能を確認してください。')
    } catch (error) {
      console.error('コピーエラー:', error)
    }
  }
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* A5000ステータス */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">🖥️ RTX A5000 最適化状況</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            a5000Status?.systemHealth.overall === 'excellent' ? 'bg-green-100 text-green-800' :
            a5000Status?.systemHealth.overall === 'good' ? 'bg-blue-100 text-blue-800' :
            a5000Status?.systemHealth.overall === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {a5000Status?.systemHealth.overall === 'excellent' ? '最適' :
             a5000Status?.systemHealth.overall === 'good' ? '良好' :
             a5000Status?.systemHealth.overall === 'warning' ? '注意' : '警告'}
          </div>
        </div>
        
        {/* GPU基本情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">{A5000_CONFIG.gpu.vram}GB</div>
            <div className="text-sm text-gray-600">VRAM容量</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-2xl font-bold text-green-600">{A5000_CONFIG.gpu.cudaCores}</div>
            <div className="text-sm text-gray-600">CUDA Cores</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-2xl font-bold text-purple-600">{A5000_CONFIG.gpu.computeCapability}</div>
            <div className="text-sm text-gray-600">Compute</div>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <div className="text-2xl font-bold text-orange-600">{A5000_CONFIG.gpu.maxPowerDraw}W</div>
            <div className="text-sm text-gray-600">Max Power</div>
          </div>
        </div>
      </div>
      
      {/* 設定選択 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">⚙️ 最適化設定</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* モデル選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">対象モデル</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as '4b' | '12b')}
              className="w-full border rounded px-3 py-2"
            >
              <option value="4b">Gemma3 4B (高速・軽量)</option>
              <option value="12b">Gemma3 12B (高品質・重い)</option>
            </select>
          </div>
          
          {/* 用途選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">使用用途</label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value as any)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="development">開発・テスト (軽量)</option>
              <option value="demo">デモ・プレゼン (バランス)</option>
              <option value="production">本格運用 (最大性能)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* パフォーマンス予測 */}
      {a5000Status && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">⚡ パフォーマンス予測</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {a5000Status.currentPerformance.tokensPerSecond}
              </div>
              <div className="text-sm text-gray-600">tokens/秒</div>
              <div className="text-xs text-gray-500 mt-1">
                期待値: {selectedModel === '4b' ? '90-120' : '35-50'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {a5000Status.currentPerformance.responseTime}ms
              </div>
              <div className="text-sm text-gray-600">応答時間</div>
              <div className="text-xs text-gray-500 mt-1">
                50トークンの場合
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {a5000Status.currentPerformance.efficiency}%
              </div>
              <div className="text-sm text-gray-600">効率性</div>
              <div className="text-xs text-gray-500 mt-1">
                理論値に対する比率
              </div>
            </div>
          </div>
          
          {/* VRAM使用量 */}
          <div className="mt-6">
            <h4 className="font-medium mb-2">VRAM使用量</h4>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(a5000Status.gpuStats.vramUsed / (A5000_CONFIG.gpu.vram * 1024)) * 100}%` 
                  }}
                />
              </div>
              <div className="text-sm text-gray-600">
                {(a5000Status.gpuStats.vramUsed / 1024).toFixed(1)}GB / {A5000_CONFIG.gpu.vram}GB
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* システム状態とアラート */}
      {a5000Status?.systemHealth.issues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ 注意事項</h4>
          <ul className="space-y-1">
            {a5000Status.systemHealth.issues.map((issue, index) => (
              <li key={index} className="text-sm text-yellow-800">• {issue}</li>
            ))}
          </ul>
          
          {a5000Status.systemHealth.recommendations.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-yellow-900 mb-1">推奨対応:</h5>
              <ul className="space-y-1">
                {a5000Status.systemHealth.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-yellow-700">→ {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* アクションボタン */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">🛠️ 設定管理</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={copySetupCommands}
            className="bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            📋 最適化設定をコピー
          </button>
          
          <button
            onClick={runPerformanceTest}
            className="bg-green-600 text-white py-3 px-4 rounded hover:bg-green-700 transition-colors"
          >
            🚀 ベンチマークテスト
          </button>
        </div>
        
        {/* セットアップコマンドプレビュー */}
        <div className="mt-4">
          <details className="bg-gray-50 p-3 rounded">
            <summary className="cursor-pointer font-medium text-gray-700">
              セットアップコマンドプレビュー
            </summary>
            <pre className="mt-2 text-xs overflow-x-auto text-gray-600">
              {setupCommands}
            </pre>
          </details>
        </div>
      </div>
      
      {/* 期待される改善効果 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">🎯 最適化による改善効果</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">パフォーマンス向上</h4>
            <ul className="text-sm space-y-1">
              <li>✅ 4Bモデル: 60-80 → <strong>90-120 tokens/s</strong></li>
              <li>✅ 12Bモデル: 20-30 → <strong>35-50 tokens/s</strong></li>
              <li>✅ 応答時間: 30-50%短縮</li>
              <li>✅ 並列処理: 最大3モデル同時実行</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">リソース効率化</h4>
            <ul className="text-sm space-y-1">
              <li>✅ VRAM使用量: 最適化済み</li>
              <li>✅ GPU使用率: 向上</li>
              <li>✅ 熱効率: 改善</li>
              <li>✅ 安定性: 向上</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}