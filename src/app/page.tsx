// src/app/page.tsx (GPU最適化統合版)

import { useState, useEffect } from 'react'
import { GPUSettingsPanel } from '../components/GPUSettingsPanel'
import { ModelSelector } from '../components/ModelSelector'
import { CharacterWizard } from '../components/CharacterWizard'
import { Gemma3AdvancedTester } from '../components/Gemma3AdvancedTester'
import { CharacterPreview } from '../components/CharacterPreview'
import { ExportPanel } from '../components/ExportPanel'
import { GPUOptimizedOllamaClient } from '../lib/ollama-client-gpu-optimized'
import { Gemma3Character } from '../types/character'

type AppStep = 'setup' | 'select' | 'create' | 'test' | 'export'

export default function CharacterBuilder() {
  const [step, setStep] = useState<AppStep>('setup')
  const [modelSize, setModelSize] = useState<'4b' | '12b'>('4b')
  const [character, setCharacter] = useState<Gemma3Character | null>(null)
  const [gpuClient, setGpuClient] = useState<GPUOptimizedOllamaClient | null>(null)
  const [systemReady, setSystemReady] = useState(false)
  
  // 初期システムチェック
  useEffect(() => {
    checkSystemReadiness()
  }, [])
  
  const checkSystemReadiness = async () => {
    try {
      const client = await GPUOptimizedOllamaClient.createOptimized()
      setGpuClient(client)
      
      const systemInfo = await client.getSystemInfo()
      
      if (systemInfo.ollama.status === 'connected') {
        setSystemReady(true)
        // システムが準備できていればモデル選択にスキップ
        setStep('select')
      } else {
        setSystemReady(false)
        // GPU設定が必要
        setStep('setup')
      }
    } catch (error) {
      console.error('システム初期化エラー:', error)
      setSystemReady(false)
      setStep('setup')
    }
  }
  
  // キャラクター作成完了時
  const handleCharacterComplete = (char: Gemma3Character) => {
    setCharacter(char)
    setStep('test')
  }
  
  // エクスポート処理
  const handleExport = async () => {
    if (!character) return
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(character)
      })
      
      const data = await response.json()
      
      // ファイル名にGPU設定も含める
      const fileName = `${character.name}_gemma3_${character.modelSize}_optimized.json`
      downloadJSON(data, fileName)
    } catch (error) {
      console.error('エクスポートエラー:', error)
      alert('エクスポートに失敗しました。')
    }
  }
  
  // JSON ダウンロード
  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            🎭 Gemma3 Character Builder
          </h1>
          <p className="text-gray-600">
            NVIDIA RTX A5000 最適化版 - Ubuntu 24.04 対応
          </p>
        </div>
        
        {/* ステップインジケーター */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            {[
              { id: 'setup', label: 'GPU設定', icon: '🖥️' },
              { id: 'select', label: 'モデル選択', icon: '🎯' },
              { id: 'create', label: 'キャラ作成', icon: '🎭' },
              { id: 'test', label: 'テスト', icon: '🧪' },
              { id: 'export', label: 'エクスポート', icon: '📦' }
            ].map((stepInfo, index) => (
              <div
                key={stepInfo.id}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  step === stepInfo.id
                    ? 'bg-blue-600 text-white'
                    : systemReady && ['select', 'create', 'test', 'export'].includes(stepInfo.id)
                    ? 'bg-white text-gray-700 shadow'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                <span>{stepInfo.icon}</span>
                <span className="text-sm font-medium">{stepInfo.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* メインコンテンツ */}
        <div className="space-y-8">
          
          {/* GPU設定ステップ */}
          {step === 'setup' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">🖥️ GPU環境設定</h2>
                <p className="text-gray-600">
                  最適なパフォーマンスのためにGPU設定を確認・調整します。
                </p>
              </div>
              
              <GPUSettingsPanel />
              
              {/* 設定完了後の進行ボタン */}
              <div className="mt-6 text-center">
                <button
                  onClick={checkSystemReadiness}
                  className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 transition-colors"
                >
                  設定完了 - 次のステップへ
                </button>
              </div>
            </div>
          )}
          
          {/* モデル選択ステップ */}
          {step === 'select' && systemReady && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">🎯 モデルサイズ選択</h2>
                <p className="text-gray-600">
                  用途に応じてGemma3モデルのサイズを選択してください。
                </p>
              </div>
              
              <ModelSelector
                onSelect={(size) => {
                  setModelSize(size)
                  setStep('create')
                }}
                gpuInfo={gpuClient ? {
                  name: 'RTX A5000',
                  vram: 24,
                  recommendations: {
                    '4b': 'high-speed',
                    '12b': 'high-quality'
                  }
                } : undefined}
              />
            </div>
          )}
          
          {/* キャラクター作成ステップ */}
          {step === 'create' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">🎭 キャラクター作成</h2>
                <p className="text-gray-600">
                  Gemma3 {modelSize.toUpperCase()}モデル用に最適化されたキャラクターを作成します。
                </p>
              </div>
              
              <CharacterWizard
                modelSize={modelSize}
                onComplete={handleCharacterComplete}
                gpuOptimization={true}
              />
            </div>
          )}
          
          {/* テストステップ */}
          {step === 'test' && character && gpuClient && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">🧪 キャラクターテスト</h2>
                <p className="text-gray-600">
                  作成したキャラクターの動作を確認します。
                </p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* キャラクター情報 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">キャラクター設定</h3>
                  <CharacterPreview character={character} />
                  
                  {/* GPU最適化情報 */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">GPU最適化状況</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>モデル: Gemma3 {character.modelSize.toUpperCase()}</div>
                      <div>GPU: RTX A5000 最適化済み</div>
                      <div>予想性能: ~{character.modelSize === '4b' ? '90-120' : '35-50'} tokens/s</div>
                    </div>
                  </div>
                </div>
                
                {/* テストパネル */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">動作テスト</h3>
                  <Gemma3AdvancedTester character={character} />
                </div>
              </div>
              
              {/* ナビゲーションボタン */}
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep('create')}
                  className="bg-gray-600 text-white py-2 px-6 rounded hover:bg-gray-700"
                >
                  ← キャラクター編集に戻る
                </button>
                <button
                  onClick={() => setStep('export')}
                  className="bg-green-600 text-white py-2 px-6 rounded hover:bg-green-700"
                >
                  エクスポートに進む →
                </button>
              </div>
            </div>
          )}
          
          {/* エクスポートステップ */}
          {step === 'export' && character && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">📦 エクスポート</h2>
                <p className="text-gray-600">
                  キャラクター設定を本体プログラム用形式でエクスポートします。
                </p>
              </div>
              
              <ExportPanel
                character={character}
                onExport={handleExport}
                includeGPUSettings={true}
              />
              
              {/* 完了後の案内 */}
              <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">🎉 作成完了！</h3>
                <p className="text-green-800 mb-4">
                  キャラクター設定がエクスポートされました。本体プログラムで読み込んでご利用ください。
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setCharacter(null)
                      setStep('select')
                    }}
                    className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                  >
                    新しいキャラクターを作成
                  </button>
                  <button
                    onClick={() => setStep('test')}
                    className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
                  >
                    テストに戻る
                  </button>
                </div>
              </div>
            </div>
          )}
          
        </div>
        
        {/* フッター情報 */}
        <div className="mt-16 border-t pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold mb-2">システム要件</h4>
              <ul className="space-y-1">
                <li>• Ubuntu 24.04 LTS</li>
                <li>• NVIDIA RTX A5000</li>
                <li>• CUDA 12.1+</li>
                <li>• Ollama最新版</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">サポートモデル</h4>
              <ul className="space-y-1">
                <li>• Gemma3 4B (高速)</li>
                <li>• Gemma3 12B (高品質)</li>
                <li>• 日本語対話最適化</li>
                <li>• 漫才風キャラクター</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">パフォーマンス</h4>
              <ul className="space-y-1">
                <li>• 4B: 90-120 tokens/s</li>
                <li>• 12B: 35-50 tokens/s</li>
                <li>• 並列処理: 2モデル同時</li>
                <li>• 応答時間: 0.4-1.4秒</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}