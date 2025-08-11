// src/components/CharacterCreationWizard.tsx
// Gemma3専用キャラクター作成ウィザード

'use client'

import { useState } from 'react'
import { Gemma3Character } from '../types/character'

interface CharacterCreationWizardProps {
  modelSize: '4b' | '12b'
  onComplete: (character: Gemma3Character) => void
}

export function CharacterCreationWizard({ modelSize, onComplete }: CharacterCreationWizardProps) {
  const [step, setStep] = useState(1)
  const [character, setCharacter] = useState<Partial<Gemma3Character>>({
    id: crypto.randomUUID(),
    modelSize,
    ollamaConfig: {
      endpoint: 'http://localhost:11434',
      model: `gemma3:${modelSize}`,
      temperature: 1.0,
      top_k: 64,
      top_p: 0.95,
      repeat_penalty: 1.0,
      max_tokens: modelSize === '4b' ? 100 : 150,
      num_ctx: modelSize === '4b' ? 8192 : 16384
    },
    testResults: []
  })

  const updateCharacter = (updates: Partial<Gemma3Character>) => {
    setCharacter(prev => ({ ...prev, ...updates }))
  }

  const generatePrompt = () => {
    if (!character.name || !character.personality?.core) return ''
    
    return `<start_of_turn>user
あなたは「${character.name}」として振る舞ってください。

【基本設定】
名前: ${character.name}
役割: ${character.role === 'boke' ? 'ボケ担当' : 'ツッコミ担当'}
性格: ${character.personality.core}
${character.background?.occupation ? `職業: ${character.background.occupation}` : ''}
${character.background?.age ? `年齢: ${character.background.age}` : ''}

【話し方】
語尾: 「${character.speechStyle?.sentenceEndings?.[0] || 'だよ'}」
一人称: ${character.speechStyle?.firstPerson || '僕'}

【重要】30-50文字で返答してください。上記の設定を守ること。

話しかけられた内容：[USER_INPUT]
<end_of_turn>
<start_of_turn>model`
  }

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return !!(character.name && character.role)
      case 2:
        return !!(character.personality?.core && character.speechStyle?.sentenceEndings?.[0])
      case 3:
        return !!(character.background?.occupation)
      default:
        return true
    }
  }

  const completeCreation = () => {
    const completeCharacter: Gemma3Character = {
      id: character.id!,
      name: character.name!,
      role: character.role!,
      modelSize: character.modelSize!,
      personality: {
        core: character.personality?.core || '',
        traits: character.personality?.traits || []
      },
      speechStyle: {
        tone: character.speechStyle?.tone || 'casual',
        sentenceEndings: character.speechStyle?.sentenceEndings || ['だよ'],
        examples: character.speechStyle?.examples || [],
        firstPerson: character.speechStyle?.firstPerson || '僕'
      },
      background: {
        origin: character.background?.origin || '',
        occupation: character.background?.occupation || '',
        age: character.background?.age || '',
        experiences: character.background?.experiences || []
      },
      abilities: {
        strengths: character.abilities?.strengths || [],
        weaknesses: character.abilities?.weaknesses || [],
        interests: character.abilities?.interests || []
      },
      relationships: {
        withUser: {
          closeness: 'friend',
          history: '今日初めて会った',
          tone: 'casual'
        }
      },
      promptTemplate: generatePrompt(),
      ollamaConfig: character.ollamaConfig!,
      testResults: []
    }

    onComplete(completeCharacter)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ステップ表示 */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3, 4].map(stepNum => (
            <div key={stepNum} className={`
              flex items-center justify-center w-10 h-10 rounded-full font-semibold
              ${step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              {stepNum}
            </div>
          ))}
        </div>
        <div className="text-center mt-2 text-gray-600">
          ステップ {step}/4: {
            step === 1 ? '基本設定' :
            step === 2 ? '性格・話し方' :
            step === 3 ? '背景設定' : '確認・完成'
          }
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-lg">
        
        {/* ステップ1: 基本設定 */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">🎭 基本設定</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">キャラクター名</label>
                <input
                  type="text"
                  value={character.name || ''}
                  onChange={(e) => updateCharacter({ name: e.target.value })}
                  placeholder="例: 田中太郎"
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">役割</label>
                <select
                  value={character.role || ''}
                  onChange={(e) => updateCharacter({ role: e.target.value as 'boke' | 'tsukkomi' })}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  <option value="boke">ボケ担当（天然、おっとり）</option>
                  <option value="tsukkomi">ツッコミ担当（しっかり者、冷静）</option>
                </select>
              </div>
            </div>

            {/* Gemma3モデル情報 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 選択中のモデル</h3>
              <div className="text-sm text-blue-800">
                <div>Gemma3 {modelSize.toUpperCase()}</div>
                <div>推奨設定: {modelSize === '4b' ? 'シンプルな性格設定' : '詳細な背景設定可能'}</div>
                <div>期待性能: {modelSize === '4b' ? '高速応答' : '高品質対話'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ステップ2: 性格・話し方 */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">💭 性格・話し方</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">核となる性格（1-2文）</label>
              <textarea
                value={character.personality?.core || ''}
                onChange={(e) => updateCharacter({
                  personality: { ...character.personality, core: e.target.value }
                })}
                placeholder={character.role === 'boke' ? 
                  "例: 天然でおっとりしているが、時々鋭い発言をする純粋な性格" :
                  "例: 冷静で論理的だが、時々熱くなってしまう真面目な性格"
                }
                rows={3}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">語尾</label>
                <input
                  type="text"
                  value={character.speechStyle?.sentenceEndings?.[0] || ''}
                  onChange={(e) => updateCharacter({
                    speechStyle: {
                      ...character.speechStyle,
                      sentenceEndings: [e.target.value]
                    }
                  })}
                  placeholder="例: だよ、です、だね"
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">一人称</label>
                <select
                  value={character.speechStyle?.firstPerson || ''}
                  onChange={(e) => updateCharacter({
                    speechStyle: {
                      ...character.speechStyle,
                      firstPerson: e.target.value
                    }
                  })}
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  <option value="僕">僕（親しみやすい）</option>
                  <option value="私">私（丁寧）</option>
                  <option value="俺">俺（カジュアル）</option>
                  <option value="わたし">わたし（可愛らしい）</option>
                </select>
              </div>
            </div>

            {/* リアルタイムプレビュー */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">💬 話し方プレビュー</h4>
              <div className="text-sm text-gray-700">
                {character.name || 'キャラクター'}「{character.speechStyle?.firstPerson || '僕'}の名前は{character.name || 'キャラクター'}だよ、よろしく{character.speechStyle?.sentenceEndings?.[0] || 'だよ'}」
              </div>
            </div>
          </div>
        )}

        {/* ステップ3: 背景設定 */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">🏠 背景設定</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">職業</label>
                <input
                  type="text"
                  value={character.background?.occupation || ''}
                  onChange={(e) => updateCharacter({
                    background: { ...character.background, occupation: e.target.value }
                  })}
                  placeholder="例: 大学生、会社員"
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">年齢</label>
                <input
                  type="text"
                  value={character.background?.age || ''}
                  onChange={(e) => updateCharacter({
                    background: { ...character.background, age: e.target.value }
                  })}
                  placeholder="例: 20代前半"
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">出身地</label>
                <input
                  type="text"
                  value={character.background?.origin || ''}
                  onChange={(e) => updateCharacter({
                    background: { ...character.background, origin: e.target.value }
                  })}
                  placeholder="例: 大阪出身"
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Gemma3モデル別の推奨事項 */}
            <div className={`p-4 rounded-lg ${modelSize === '4b' ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <h4 className="font-semibold mb-2">
                💡 Gemma3 {modelSize.toUpperCase()}での推奨事項
              </h4>
              <div className="text-sm">
                {modelSize === '4b' ? (
                  <ul className="space-y-1 text-yellow-800">
                    <li>• シンプルな設定の方が効果的</li>
                    <li>• 1-2個の特徴に絞る</li>
                    <li>• 具体的な例を重視</li>
                  </ul>
                ) : (
                  <ul className="space-y-1 text-green-800">
                    <li>• 詳細な背景設定が可能</li>
                    <li>• 複数の特徴を組み合わせ可能</li>
                    <li>• 複雑な文脈理解が期待できる</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ステップ4: 確認・完成 */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">✅ 確認・完成</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* キャラクター概要 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📋 キャラクター概要</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                  <div><strong>名前:</strong> {character.name}</div>
                  <div><strong>役割:</strong> {character.role === 'boke' ? 'ボケ担当' : 'ツッコミ担当'}</div>
                  <div><strong>性格:</strong> {character.personality?.core}</div>
                  <div><strong>話し方:</strong> {character.speechStyle?.firstPerson} + {character.speechStyle?.sentenceEndings?.[0]}</div>
                  <div><strong>職業:</strong> {character.background?.occupation}</div>
                  <div><strong>年齢:</strong> {character.background?.age}</div>
                </div>
              </div>

              {/* プロンプトプレビュー */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">🔧 生成されるプロンプト</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {generatePrompt().substring(0, 300)}...
                  </pre>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">🎉 作成完了準備完了！</h4>
              <p className="text-green-800 text-sm">
                Gemma3 {modelSize.toUpperCase()}に最適化されたキャラクターが完成しました。
                次のステップでテストを行い、必要に応じて調整できます。
              </p>
            </div>
          </div>
        )}

        {/* ナビゲーションボタン */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            ← 前へ
          </button>
          
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!validateStep(step)}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              次へ →
            </button>
          ) : (
            <button
              onClick={completeCreation}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              🎭 キャラクター作成完了
            </button>
          )}
        </div>
      </div>
    </div>
  )
}