// src/components/CharacterTester.tsx
// Gemma3キャラクターのリアルタイムテスト機能

'use client'

import { useState, useRef } from 'react'
import { Gemma3Character } from '../types/character'

interface Message {
  role: 'user' | 'character'
  content: string
  timestamp: Date
  responseTime?: number
}

interface TestResult {
  input: string
  output: string
  responseTime: number
  characterConsistency: number
  lengthOK: boolean
  styleMatch: boolean
}

interface CharacterTesterProps {
  character: Gemma3Character
}

export function CharacterTester({ character }: CharacterTesterProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testMode, setTestMode] = useState<'chat' | 'batch'>('chat')
  
  // Gemma3用プロンプト生成
  const buildPrompt = (userInput: string, conversationHistory: Message[] = []): string => {
    const basePrompt = `<start_of_turn>user
あなたは「${character.name}」として振る舞ってください。

【基本設定】
名前: ${character.name}
役割: ${character.role === 'boke' ? 'ボケ担当' : 'ツッコミ担当'}
性格: ${character.personality.core}
${character.background.occupation ? `職業: ${character.background.occupation}` : ''}
${character.background.age ? `年齢: ${character.background.age}` : ''}

【話し方】
語尾: 「${character.speechStyle.sentenceEndings[0]}」
一人称: ${character.speechStyle.firstPerson}

【重要】30-50文字で返答してください。上記の設定を守ること。`

    // 会話履歴を含める（直近3回まで）
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6) // 最新3往復
      const historyText = recentHistory
        .map(msg => msg.role === 'user' ? `ユーザー: ${msg.content}` : `${character.name}: ${msg.content}`)
        .join('\n')
      
      return `${basePrompt}

【これまでの会話】
${historyText}

新しいユーザーの発言: ${userInput}
<end_of_turn>
<start_of_turn>model`
    }

    return `${basePrompt}

ユーザーの発言: ${userInput}
<end_of_turn>
<start_of_turn>model`
  }

  // Ollama API呼び出し - /api/generate を使用
  const callOllama = async (prompt: string): Promise<string> => {
    try {
      console.log('Calling /api/generate with model:', character.ollamaConfig.model)
      
      // /api/generate エンドポイントを使用
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: character.ollamaConfig.model || 'gemma3:4b',
          prompt: prompt,
          stream: false,
          options: {
            temperature: character.ollamaConfig.temperature || 1.0,
            top_k: character.ollamaConfig.top_k || 64,
            top_p: character.ollamaConfig.top_p || 0.95,
            repeat_penalty: character.ollamaConfig.repeat_penalty || 1.0,
            num_predict: character.ollamaConfig.max_tokens || 100,
            num_ctx: character.ollamaConfig.num_ctx || 8192,
            stop: ['<end_of_turn>', '<start_of_turn>']
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Generate API error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Generation failed')
      }

      const data = await response.json()
      console.log('Response received, length:', data.response?.length)
      
      return data.response?.trim() || ''
    } catch (error) {
      console.error('callOllama error:', error)
      throw error
    }
  }

  // 単発テスト
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const startTime = Date.now()
      const prompt = buildPrompt(userMessage.content, messages)
      const response = await callOllama(prompt)
      const responseTime = Date.now() - startTime

      const characterMessage: Message = {
        role: 'character',
        content: response,
        timestamp: new Date(),
        responseTime
      }

      setMessages(prev => [...prev, characterMessage])

      // 応答品質を評価
      const testResult = evaluateResponse(userMessage.content, response, responseTime)
      setTestResults(prev => [...prev, testResult])

    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      const errorMessage: Message = {
        role: 'character',
        content: 'エラーが発生しました。再度お試しください。',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // バッチテスト用のテストケース
  const batchTestCases = [
    'こんにちは',
    'お疲れさま',
    '今日は何してた？',
    '好きな食べ物は？',
    '趣味は何？',
    'それはすごいね！',
    'えー、本当？',
    'どう思う？'
  ]

  // バッチテスト実行
  const runBatchTest = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setTestResults([])
    
    for (const testInput of batchTestCases) {
      try {
        const startTime = Date.now()
        const prompt = buildPrompt(testInput)
        const response = await callOllama(prompt)
        const responseTime = Date.now() - startTime

        const testResult = evaluateResponse(testInput, response, responseTime)
        setTestResults(prev => [...prev, testResult])

        // テスト間隔を空ける
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`バッチテストエラー (${testInput}):`, error)
      }
    }
    
    setIsLoading(false)
  }

  // 応答品質の評価
  const evaluateResponse = (input: string, output: string, responseTime: number): TestResult => {
    // 長さチェック（30-50文字推奨）
    const lengthOK = output.length >= 20 && output.length <= 70

    // スタイルマッチング
    const hasCorrectEnding = character.speechStyle.sentenceEndings.some(ending => 
      output.includes(ending)
    )
    const hasCorrectFirstPerson = output.includes(character.speechStyle.firstPerson) || 
      !output.match(/[私僕俺わたし]/)

    const styleMatch = hasCorrectEnding || hasCorrectFirstPerson

    // キャラクター一貫性（簡易版）
    const characterWords = character.personality.core.split(/[、。\s]+/)
    const matchingWords = characterWords.filter(word => 
      word.length > 1 && output.includes(word)
    ).length
    
    const characterConsistency = Math.min(matchingWords / Math.max(characterWords.length * 0.3, 1), 1)

    return {
      input,
      output,
      responseTime,
      characterConsistency,
      lengthOK,
      styleMatch
    }
  }

  // 品質スコア計算
  const calculateOverallScore = (): number => {
    if (testResults.length === 0) return 0
    
    const scores = testResults.map(result => {
      let score = 0
      if (result.lengthOK) score += 0.3
      if (result.styleMatch) score += 0.3
      if (result.responseTime < 3000) score += 0.2
      score += result.characterConsistency * 0.2
      return score
    })
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  return (
    <div className="space-y-6">
      {/* テストモード選択 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4 mb-4">
          <h3 className="text-lg font-semibold">🧪 テストモード</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setTestMode('chat')}
              className={`px-4 py-2 rounded ${
                testMode === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              💬 対話テスト
            </button>
            <button
              onClick={() => setTestMode('batch')}
              className={`px-4 py-2 rounded ${
                testMode === 'batch' ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}
            >
              📊 バッチテスト
            </button>
          </div>
        </div>

        {/* キャラクター情報表示 */}
        <div className="bg-gray-50 p-3 rounded text-sm">
          <strong>{character.name}</strong> ({character.role === 'boke' ? 'ボケ' : 'ツッコミ'}) - 
          {character.personality.core.substring(0, 50)}...
        </div>
      </div>

      {/* 対話テストモード */}
      {testMode === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* チャット画面 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-semibold mb-4">💬 リアルタイム対話</h4>
            
            {/* メッセージ表示エリア */}
            <div className="h-96 overflow-y-auto border rounded p-4 mb-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-gray-500 text-center">
                  {character.name}との対話を開始しましょう！
                </div>
              )}
              
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="font-medium text-xs mb-1">
                      {message.role === 'user' ? 'あなた' : character.name}
                    </div>
                    <div>{message.content}</div>
                    {message.responseTime && (
                      <div className="text-xs opacity-70 mt-1">
                        {message.responseTime}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="animate-pulse">考え中...</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* 入力エリア */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={`${character.name}に話しかけてみましょう...`}
                className="flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputText.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                送信
              </button>
            </div>
          </div>

          {/* リアルタイム評価 */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-semibold mb-4">📊 品質評価</h4>
            
            {testResults.length > 0 && (
              <div className="space-y-4">
                {/* 総合スコア */}
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-sm text-blue-600 mb-1">総合品質スコア</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {Math.round(calculateOverallScore() * 100)}%
                  </div>
                </div>

                {/* 最新の評価結果 */}
                <div className="space-y-2">
                  <h5 className="font-medium">最新の応答評価</h5>
                  {testResults.slice(-3).reverse().map((result, index) => (
                    <div key={index} className="border-l-4 border-gray-200 pl-3 text-sm">
                      <div className="font-medium">入力: {result.input}</div>
                      <div className="text-gray-600">出力: {result.output}</div>
                      <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                        <span className={result.lengthOK ? 'text-green-600' : 'text-red-600'}>
                          長さ: {result.lengthOK ? '✓' : '✗'}
                        </span>
                        <span className={result.styleMatch ? 'text-green-600' : 'text-red-600'}>
                          スタイル: {result.styleMatch ? '✓' : '✗'}
                        </span>
                        <span>応答: {result.responseTime}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {testResults.length === 0 && (
              <div className="text-gray-500 text-center py-8">
                対話を開始すると品質評価が表示されます
              </div>
            )}
          </div>
        </div>
      )}

      {/* バッチテストモード */}
      {testMode === 'batch' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold">📊 バッチテスト</h4>
            <button
              onClick={runBatchTest}
              disabled={isLoading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? '実行中...' : '🚀 テスト実行'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* テストケース一覧 */}
            <div>
              <h5 className="font-medium mb-3">テストケース</h5>
              <div className="space-y-2">
                {batchTestCases.map((testCase, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                      {index + 1}
                    </div>
                    <div>{testCase}</div>
                    {testResults[index] && (
                      <div className={`text-xs px-2 py-1 rounded ${
                        testResults[index].lengthOK && testResults[index].styleMatch
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {testResults[index].responseTime}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 結果サマリー */}
            <div>
              <h5 className="font-medium mb-3">テスト結果</h5>
              {testResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-blue-600 mb-1">平均応答時間</div>
                      <div className="font-bold">
                        {Math.round(testResults.reduce((sum, r) => sum + r.responseTime, 0) / testResults.length)}ms
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-green-600 mb-1">成功率</div>
                      <div className="font-bold">
                        {Math.round((testResults.filter(r => r.lengthOK && r.styleMatch).length / testResults.length) * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {testResults.map((result, index) => (
                      <div key={index} className="border rounded p-3 text-sm">
                        <div className="font-medium">Q: {result.input}</div>
                        <div className="text-gray-700 mt-1">A: {result.output}</div>
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                          <div className="space-x-2">
                            <span className={result.lengthOK ? 'text-green-600' : 'text-red-600'}>
                              長さ: {result.lengthOK ? '✓' : '✗'}
                            </span>
                            <span className={result.styleMatch ? 'text-green-600' : 'text-red-600'}>
                              スタイル: {result.styleMatch ? '✓' : '✗'}
                            </span>
                          </div>
                          <div>{result.responseTime}ms</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  バッチテストを実行すると結果が表示されます
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}