// src/app/page.tsx - 実際に動作するキャラクタービルダー

'use client'

import { useState, useEffect } from 'react'
import { CharacterCreationWizard } from '../components/CharacterCreationWizard'
import { CharacterTester } from '../components/CharacterTester'
import { Gemma3Character } from '../types/character'

type AppStep = 'welcome' | 'model-select' | 'character-create' | 'test' | 'export'

interface SystemStatus {
  ollamaConnected: boolean
  gemma3Available: boolean
  error?: string
}

export default function Gemma3CharacterBuilder() {
  const [currentStep, setCurrentStep] = useState<AppStep>('welcome')
  const [selectedModel, setSelectedModel] = useState<'4b' | '12b'>('4b')
  const [character, setCharacter] = useState<Gemma3Character | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    ollamaConnected: false,
    gemma3Available: false
  })
  const [isChecking, setIsChecking] = useState(false)

  // システム状態チェック - 改善版
  const checkSystemStatus = async () => {
    setIsChecking(true)
    console.log('システム状態チェック開始...')
    
    try {
      // まずシンプルなテストエンドポイントで確認
      const testResponse = await fetch('/api/test')
      const testData = await testResponse.json()
      
      console.log('テスト結果:', testData)
      
      if (testData.success) {
        const hasGemma3 = testData.models.some((name: string) => 
          name.includes('gemma3')
        )
        
        setSystemStatus({
          ollamaConnected: true,
          gemma3Available: hasGemma3
        })
        
        console.log('接続成功！モデル:', testData.models)
      } else {
        throw new Error(testData.error)
      }
    } catch (error) {
      console.error('接続エラー:', error)
      setSystemStatus({
        ollamaConnected: false,
        gemma3Available: false,
        error: (error as Error).message
      })
    } finally {
      setIsChecking(false)
    }
  }
  useEffect(() => {
    checkSystemStatus()
  }, [])

  // キャラクター作成完了
  const handleCharacterComplete = (newCharacter: Gemma3Character) => {
    setCharacter(newCharacter)
    setCurrentStep('test')
  }

  // エクスポート機能
  const exportCharacter = () => {
    if (!character) return

    const exportData = {
      version: '2.0.0',
      metadata: {
        createdAt: new Date().toISOString(),
        builderVersion: 'gemma3-optimized',
        modelInfo: {
          name: `gemma3:${character.modelSize}`,
          contextWindow: character.modelSize === '4b' ? 8192 : 16384,
          recommendedTokens: character.modelSize === '4b' ? 100 : 150
        }
      },
      characterData: character,
      agentConfig: {
        name: character.name,
        provider: 'Ollama',
        model: `gemma3:${character.modelSize}`,
        endpoint: character.ollamaConfig.endpoint,
        temperature: character.ollamaConfig.temperature,
        top_p: character.ollamaConfig.top_p,
        max_tokens: character.ollamaConfig.max_tokens,
        repetition_penalty: character.ollamaConfig.repeat_penalty,
        promptStyle: character.promptTemplate,
        failover: 'OFF',
        timeout_s: 30
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${character.name}_gemma3_${character.modelSize}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const stepInfo = [
    { id: 'welcome', label: 'ようこそ', icon: '👋' },
    { id: 'model-select', label: 'モデル選択', icon: '🎯' },
    { id: 'character-create', label: 'キャラ作成', icon: '🎭' },
    { id: 'test', label: 'テスト', icon: '🧪' },
    { id: 'export', label: 'エクスポート', icon: '📦' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            🎭 Gemma3 Character Builder
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            高性能日本語AIキャラクター作成ツール
          </p>
          
          {/* システム状態表示 */}
          <div className="inline-flex items-center space-x-4 bg-white px-4 py-2 rounded-lg shadow">
            <div className={`flex items-center space-x-2 ${
              systemStatus.ollamaConnected ? 'text-green-600' : 'text-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                systemStatus.ollamaConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm">Ollama</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${
              systemStatus.gemma3Available ? 'text-green-600' : 'text-gray-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                systemStatus.gemma3Available ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm">Gemma3</span>
            </div>
            
            <button
              onClick={checkSystemStatus}
              disabled={isChecking}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            >
              {isChecking ? '🔄' : '↻'}
            </button>
          </div>

          {systemStatus.error && (
            <div className="mt-2 text-red-600 text-sm">
              {systemStatus.error}
            </div>
          )}
        </div>

        {/* ステップナビゲーション */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2 overflow-x-auto">
            {stepInfo.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap
                  ${currentStep === step.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : systemStatus.ollamaConnected
                    ? 'bg-white text-gray-700 shadow cursor-pointer hover:shadow-md'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
                onClick={() => systemStatus.ollamaConnected && setCurrentStep(step.id as AppStep)}>
                  <span className="text-lg">{step.icon}</span>
                  <span className="font-medium">{step.label}</span>
                </div>
                
                {index < stepInfo.length - 1 && (
                  <div className="w-4 h-0.5 bg-gray-300 mx-2"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="max-w-6xl mx-auto">
          
          {/* ウェルカム画面 */}
          {currentStep === 'welcome' && (
            <div className="text-center space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="text-6xl mb-6">🎭</div>
                <h2 className="text-3xl font-bold mb-4">Gemma3で高品質キャラクターを作成</h2>
                <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                  RTX A5000とGemma3の組み合わせで、自然で一貫性のある日本語AIキャラクターを作成できます。
                  漫才風の対話から真面目な会話まで、用途に応じたキャラクターを簡単に構築できます。
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">🎯</div>
                    <h3 className="font-semibold mb-1">Gemma3最適化</h3>
                    <p className="text-sm text-gray-600">システムロール非対応に対応した専用プロンプト設計</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">💬</div>
                    <h3 className="font-semibold mb-1">日本語特化</h3>
                    <p className="text-sm text-gray-600">自然な日本語対話とキャラクター一貫性</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">🧪</div>
                    <h3 className="font-semibold mb-1">リアルタイムテスト</h3>
                    <p className="text-sm text-gray-600">作成中にキャラクターをテスト・調整可能</p>
                  </div>
                </div>

                {systemStatus.ollamaConnected ? (
                  <button
                    onClick={() => setCurrentStep('model-select')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-4 px-8 rounded-lg text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    🚀 キャラクター作成を開始
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-yellow-800 mb-2">⚠️ システム準備が必要です</h4>
                      <div className="text-sm text-yellow-700 space-y-1">
                        {!systemStatus.ollamaConnected && (
                          <div>• Ollamaが起動していません</div>
                        )}
                        {!systemStatus.gemma3Available && systemStatus.ollamaConnected && (
                          <div>• Gemma3モデルがインストールされていません</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg text-left max-w-md mx-auto">
                      <h5 className="font-semibold mb-2">🔧 セットアップ手順</h5>
                      <div className="text-sm space-y-1">
                        <div>1. <code className="bg-gray-200 px-1 rounded">sudo systemctl start ollama</code></div>
                        <div>2. <code className="bg-gray-200 px-1 rounded">ollama pull gemma3:4b</code></div>
                        <div>3. 上の🔄ボタンで再確認</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* モデル選択 */}
          {currentStep === 'model-select' && systemStatus.ollamaConnected && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">🎯 Gemma3モデル選択</h2>
                <p className="text-gray-600">
                  作成するキャラクターの用途に応じてモデルサイズを選択してください
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gemma3 4B */}
                <div className={`
                  bg-white p-6 rounded-xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl
                  ${selectedModel === '4b' ? 'ring-2 ring-blue-500 transform scale-105' : 'hover:transform hover:scale-102'}
                `}
                onClick={() => setSelectedModel('4b')}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-xl font-bold mb-2">Gemma3 4B</h3>
                    <p className="text-gray-600 mb-4">高速・軽量モデル</p>
                    
                    <div className="space-y-2 text-sm text-left">
                      <div className="flex justify-between">
                        <span>応答速度:</span>
                        <span className="font-bold text-green-600">高速</span>
                      </div>
                      <div className="flex justify-between">
                        <span>メモリ使用:</span>
                        <span className="font-bold">約5GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>キャラ設定:</span>
                        <span className="font-bold">シンプル推奨</span>
                      </div>
                      <div className="flex justify-between">
                        <span>推奨用途:</span>
                        <span className="font-bold text-blue-600">高速対話</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>適用場面:</strong> リアルタイム対話、開発・テスト、軽快な会話
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Gemma3 12B */}
                <div className={`
                  bg-white p-6 rounded-xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl
                  ${selectedModel === '12b' ? 'ring-2 ring-purple-500 transform scale-105' : 'hover:transform hover:scale-102'}
                `}
                onClick={() => setSelectedModel('12b')}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="text-xl font-bold mb-2">Gemma3 12B</h3>
                    <p className="text-gray-600 mb-4">高品質・高精度モデル</p>
                    
                    <div className="space-y-2 text-sm text-left">
                      <div className="flex justify-between">
                        <span>応答速度:</span>
                        <span className="font-bold text-yellow-600">標準</span>
                      </div>
                      <div className="flex justify-between">
                        <span>メモリ使用:</span>
                        <span className="font-bold">約8GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>キャラ設定:</span>
                        <span className="font-bold">詳細可能</span>
                      </div>
                      <div className="flex justify-between">
                        <span>推奨用途:</span>
                        <span className="font-bold text-purple-600">高品質対話</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-800">
                        <strong>適用場面:</strong> 複雑な文脈理解、詳細なキャラクター、本格運用
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setCurrentStep('character-create')}
                  className="bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg text-lg hover:bg-blue-700 transition-all duration-300 shadow-lg"
                >
                  {selectedModel === '4b' ? '⚡' : '🎯'} Gemma3 {selectedModel.toUpperCase()}で作成開始
                </button>
              </div>
            </div>
          )}

          {/* キャラクター作成 */}
          {currentStep === 'character-create' && (
            <div>
              <CharacterCreationWizard
                modelSize={selectedModel}
                onComplete={handleCharacterComplete}
              />
            </div>
          )}

          {/* テスト */}
          {currentStep === 'test' && character && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">🧪 キャラクターテスト</h2>
                <p className="text-gray-600">
                  作成した{character.name}の動作をテストして品質を確認しましょう
                </p>
              </div>

              <CharacterTester character={character} />

              {/* ナビゲーション */}
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep('character-create')}
                  className="bg-gray-600 text-white py-2 px-6 rounded hover:bg-gray-700"
                >
                  ← キャラクター編集に戻る
                </button>
                <button
                  onClick={() => setCurrentStep('export')}
                  className="bg-green-600 text-white py-2 px-6 rounded hover:bg-green-700"
                >
                  エクスポートに進む →
                </button>
              </div>
            </div>
          )}

          {/* エクスポート */}
          {currentStep === 'export' && character && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">📦 エクスポート</h2>
                <p className="text-gray-600">
                  {character.name}の設定を保存・共有用にエクスポートします
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold mb-4">📋 キャラクター情報</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                  <div><strong>名前:</strong> {character.name}</div>
                  <div><strong>役割:</strong> {character.role === 'boke' ? 'ボケ担当' : 'ツッコミ担当'}</div>
                  <div><strong>モデル:</strong> Gemma3 {character.modelSize.toUpperCase()}</div>
                  <div><strong>性格:</strong> {character.personality.core.substring(0, 30)}...</div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">📄 エクスポート内容</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• キャラクター設定（性格、話し方、背景）</li>
                    <li>• Gemma3最適化プロンプト</li>
                    <li>• Ollama設定パラメータ</li>
                    <li>• 本体プログラム互換AgentConfig</li>
                  </ul>
                </div>

                <button
                  onClick={exportCharacter}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-all duration-300"
                >
                  📁 {character.name}_gemma3_{character.modelSize}.json をダウンロード
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 p-6 rounded-lg max-w-2xl mx-auto">
                <h3 className="font-semibold text-green-900 mb-2">🎉 作成完了！</h3>
                <p className="text-green-800 mb-4">
                  {character.name}の作成が完了しました。エクスポートしたファイルを本体プログラムで読み込んで使用できます。
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setCharacter(null)
                      setCurrentStep('model-select')
                    }}
                    className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                  >
                    🎭 新しいキャラクター作成
                  </button>
                  <button
                    onClick={() => setCurrentStep('test')}
                    className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
                  >
                    🧪 テストに戻る
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-16 border-t pt-8 text-center text-sm text-gray-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <strong>システム要件</strong><br/>
              Ubuntu 24.04 + RTX A5000 + Ollama
            </div>
            <div>
              <strong>対応モデル</strong><br/>
              Gemma3 4B/12B (日本語最適化)
            </div>
            <div>
              <strong>キャラクター用途</strong><br/>
              漫才風対話・真面目な会話・カスタム設定
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}