// src/components/Gemma3AdvancedTester.tsx

import { useState, useRef } from 'react'
import { EnhancedOllamaClient } from '../lib/ollama-client-enhanced'
import { EnhancedGemma3PromptBuilder } from '../lib/gemma3-prompt-enhanced'

interface TestScenario {
  category: string
  description: string
  inputs: string[]
  expectedBehaviors: string[]
  evaluationCriteria: string[]
}

interface TestResult {
  scenario: string
  input: string
  output: string
  scores: {
    characterConsistency: number  // 0-1
    lengthCompliance: number      // 0-1
    styleAccuracy: number        // 0-1
    responseQuality: number      // 0-1
    overall: number              // 0-1
  }
  responseTime: number
  tokenCount: number
  issues: string[]
}

export function Gemma3AdvancedTester({ character }: { character: Gemma3Character }) {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [currentTest, setCurrentTest] = useState<string>('')
  const [progressPercent, setProgressPercent] = useState(0)
  const ollamaClient = useRef(new EnhancedOllamaClient(character.ollamaConfig.endpoint))
  
  // Gemma3特化型テストシナリオ
  const testScenarios: TestScenario[] = [
    {
      category: '基本応答',
      description: 'キャラクターの基本的な応答パターン',
      inputs: ['こんにちは', 'はじめまして', 'お疲れさま', 'おはよう'],
      expectedBehaviors: ['挨拶を返す', '自己紹介を含む', '時間に応じた挨拶'],
      evaluationCriteria: ['語尾の一貫性', '性格の表現', '適切な長さ']
    },
    {
      category: '得意分野',
      description: 'キャラクターの得意分野での反応',
      inputs: character.abilities.strengths.slice(0, 2).map(s => `${s.area}について教えて`),
      expectedBehaviors: ['自信のある返答', '具体的な内容', '積極的な態度'],
      evaluationCriteria: ['専門性の表現', '自信の程度', '情報の正確性']
    },
    {
      category: '苦手分野',
      description: 'キャラクターの苦手分野での反応',
      inputs: character.abilities.weaknesses.slice(0, 2).map(w => `${w.area}はどう？`),
      expectedBehaviors: ['苦手意識の表現', '回避的な態度', '設定された反応パターン'],
      evaluationCriteria: ['弱点の一貫性', '自然な回避', 'キャラクター性の維持']
    },
    {
      category: 'ロール特性',
      description: character.role === 'boke' ? 'ボケキャラとしての反応' : 'ツッコミキャラとしての反応',
      inputs: character.role === 'boke' 
        ? ['何か面白いこと言って', 'ボケて', '変なこと考えて']
        : ['それはおかしいよ', 'ツッコンで', 'どう思う？'],
      expectedBehaviors: character.role === 'boke'
        ? ['天然な反応', '予想外の発想', '純粋な表現']
        : ['的確な指摘', '論理的な反応', '冷静な判断'],
      evaluationCriteria: ['ロールの一貫性', '期待される性格', '自然な表現']
    },
    {
      category: '感情表現',
      description: '様々な感情での反応パターン',
      inputs: ['嬉しいことがあったよ', '今日は疲れた', '困ったことが起きた', 'イライラする'],
      expectedBehaviors: ['共感的な反応', '適切な感情表現', 'キャラクターらしい慰め'],
      evaluationCriteria: ['感情の理解', '適切な反応', '語調の変化']
    },
    {
      category: 'ストレステスト',
      description: '長い入力や特殊な状況での安定性',
      inputs: [
        'とても長い話なんだけど、今日は朝から色々なことがあって、まず電車が遅れて、それから会社で会議があって、その後昼食を食べて、午後は別の仕事をして、夕方になってようやく一段落したんだよね',
        '？？？',
        '意味不明な入力テストですabcdefg123456',
        '' // 空入力
      ],
      expectedBehaviors: ['適切な要約', 'わからない旨の表現', '自然な対応'],
      evaluationCriteria: ['安定性', 'エラー処理', 'キャラクター維持']
    }
  ]
  
  // 包括的テスト実行
  const runComprehensiveTest = async () => {
    setIsRunning(true)
    setTestResults([])
    setProgressPercent(0)
    
    const allInputs = testScenarios.flatMap(scenario => 
      scenario.inputs.map(input => ({ scenario: scenario.category, input }))
    )
    
    const results: TestResult[] = []
    
    for (let i = 0; i < allInputs.length; i++) {
      const { scenario, input } = allInputs[i]
      setCurrentTest(`${scenario}: ${input.substring(0, 30)}...`)
      
      try {
        const result = await testSingleInput(scenario, input)
        results.push(result)
      } catch (error) {
        console.error(`テストエラー [${scenario}]:`, error)
        results.push({
          scenario,
          input,
          output: 'エラー: ' + (error as Error).message,
          scores: {
            characterConsistency: 0,
            lengthCompliance: 0,
            styleAccuracy: 0,
            responseQuality: 0,
            overall: 0
          },
          responseTime: 0,
          tokenCount: 0,
          issues: ['実行エラー']
        })
      }
      
      setProgressPercent(Math.round(((i + 1) / allInputs.length) * 100))
    }
    
    setTestResults(results)
    setIsRunning(false)
    setCurrentTest('')
  }
  
  // 単一入力のテスト
  const testSingleInput = async (scenario: string, input: string): Promise<TestResult> => {
    const prompt = EnhancedGemma3PromptBuilder.buildOptimizedPrompt(character, input)
    const startTime = Date.now()
    
    const response = await ollamaClient.current.generateWithGemma3(
      character.ollamaConfig.model,
      prompt,
      {
        temperature: character.ollamaConfig.temperature,
        top_k: character.ollamaConfig.top_k,
        top_p: character.ollamaConfig.top_p,
        num_predict: character.ollamaConfig.max_tokens
      }
    )
    
    const responseTime = Date.now() - startTime
    const output = response.response.trim()
    
    // 詳細な評価
    const evaluation = evaluateResponse(output, scenario, input)
    
    return {
      scenario,
      input,
      output,
      scores: evaluation.scores,
      responseTime,
      tokenCount: response.eval_count || 0,
      issues: evaluation.issues
    }
  }
  
  // レスポンス評価ロジック
  const evaluateResponse = (output: string, scenario: string, input: string) => {
    const issues: string[] = []
    const scores = {
      characterConsistency: 0,
      lengthCompliance: 0,
      styleAccuracy: 0,
      responseQuality: 0,
      overall: 0
    }
    
    // 長さ評価 (30-50文字推奨)
    const length = output.length
    if (length >= 30 && length <= 50) {
      scores.lengthCompliance = 1.0
    } else if (length >= 20 && length <= 70) {
      scores.lengthCompliance = 0.7
    } else {
      scores.lengthCompliance = 0.3
      issues.push(`長さ不適切: ${length}文字`)
    }
    
    // 語尾の一貫性
    const hasCorrectEnding = character.speechStyle.sentenceEndings.some(ending => 
      output.includes(ending)
    )
    if (hasCorrectEnding) {
      scores.styleAccuracy += 0.4
    } else {
      issues.push('語尾が一致しません')
    }
    
    // 一人称の一貫性
    const firstPersonUsed = output.includes(character.speechStyle.firstPerson)
    if (firstPersonUsed || !output.match(/[私僕俺わたし]/)) {
      scores.styleAccuracy += 0.3
    } else {
      issues.push('一人称が一致しません')
    }
    
    // 文として完結しているか
    if (output.match(/[。！？]$/) || output.match(/[だよねー～]$/)) {
      scores.styleAccuracy += 0.3
    } else {
      issues.push('文が不完全です')
    }
    
    // キャラクター一貫性（シナリオ別）
    scores.characterConsistency = evaluateCharacterConsistency(output, scenario)
    
    // 応答品質
    scores.responseQuality = evaluateResponseQuality(output, input)
    
    // 全体スコア
    scores.overall = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4
    
    return { scores, issues }
  }
  
  // キャラクター一貫性の評価
  const evaluateCharacterConsistency = (output: string, scenario: string): number => {
    let score = 0.5 // ベーススコア
    
    if (scenario === '得意分野') {
      // 得意分野では自信のある表現を期待
      if (output.match(/任せて|得意|上手|好き|大丈夫/)) {
        score += 0.3
      }
      if (output.match(/！|〜|♪/)) {
        score += 0.2
      }
    } else if (scenario === '苦手分野') {
      // 苦手分野では控えめな表現を期待
      if (output.match(/苦手|わからない|ちょっと|難しい/)) {
        score += 0.3
      }
      if (output.match(/\.\.\.|うーん|えーっと/)) {
        score += 0.2
      }
    } else if (scenario === 'ロール特性') {
      if (character.role === 'boke') {
        if (output.match(/え？|そうなの？|なんで？|へー/)) {
          score += 0.3
        }
      } else if (character.role === 'tsukkomi') {
        if (output.match(/でしょ|そうそう|当然|そりゃ/)) {
          score += 0.3
        }
      }
    }
    
    return Math.min(score, 1.0)
  }
  
  // 応答品質の評価
  const evaluateResponseQuality = (output: string, input: string): number => {
    let score = 0.5
    
    // 入力に対する適切な応答かどうか
    if (input.includes('こんにちは') && output.match(/こんにちは|はい|どうも/)) {
      score += 0.3
    }
    
    // 自然な日本語かどうか
    if (!output.match(/<|>|\[|\]|{|}/) && !output.includes('AI')) {
      score += 0.2
    }
    
    return Math.min(score, 1.0)
  }
  
  // 結果の分析とレポート生成
  const generateAnalysisReport = () => {
    if (testResults.length === 0) return null
    
    const overallScores = {
      characterConsistency: testResults.reduce((sum, r) => sum + r.scores.characterConsistency, 0) / testResults.length,
      lengthCompliance: testResults.reduce((sum, r) => sum + r.scores.lengthCompliance, 0) / testResults.length,
      styleAccuracy: testResults.reduce((sum, r) => sum + r.scores.styleAccuracy, 0) / testResults.length,
      responseQuality: testResults.reduce((sum, r) => sum + r.scores.responseQuality, 0) / testResults.length,
    }
    
    const avgResponseTime = testResults.reduce((sum, r) => sum + r.responseTime, 0) / testResults.length
    const avgTokensPerSecond = testResults.reduce((sum, r) => sum + (r.tokenCount / (r.responseTime / 1000)), 0) / testResults.length
    
    const commonIssues = testResults.flatMap(r => r.issues)
      .reduce((acc, issue) => {
        acc[issue] = (acc[issue] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    
    return {
      overallScores,
      performance: {
        avgResponseTime,
        avgTokensPerSecond
      },
      commonIssues: Object.entries(commonIssues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    }
  }
  
  const analysisReport = generateAnalysisReport()
  
  return (
    <div className="space-y-6">
      {/* テスト実行ボタン */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">🧪 包括的キャラクターテスト</h3>
        <p className="text-gray-600 mb-4">
          {testScenarios.length}種類のシナリオで計{testScenarios.flatMap(s => s.inputs).length}パターンをテスト
        </p>
        
        <button
          onClick={runComprehensiveTest}
          disabled={isRunning}
          className={`w-full py-3 px-6 rounded font-semibold ${
            isRunning 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? '実行中...' : '🚀 包括テスト開始'}
        </button>
        
        {/* プログレス表示 */}
        {isRunning && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>進行状況: {progressPercent}%</span>
              <span>現在: {currentTest}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* 分析レポート */}
      {analysisReport && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📊 分析レポート</h3>
          
          {/* 総合スコア */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(analysisReport.overallScores).map(([key, score]) => (
              <div key={key} className="text-center">
                <div className={`text-2xl font-bold ${
                  score >= 0.8 ? 'text-green-600' : 
                  score >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {Math.round(score * 100)}%
                </div>
                <div className="text-sm text-gray-600">
                  {key === 'characterConsistency' ? 'キャラ一貫性' :
                   key === 'lengthCompliance' ? '長さ遵守' :
                   key === 'styleAccuracy' ? 'スタイル正確性' : '応答品質'}
                </div>
              </div>
            ))}
          </div>
          
          {/* パフォーマンス */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-lg font-semibold">{Math.round(analysisReport.performance.avgResponseTime)}ms</div>
              <div className="text-sm text-gray-600">平均応答時間</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-lg font-semibold">{Math.round(analysisReport.performance.avgTokensPerSecond)}</div>
              <div className="text-sm text-gray-600">tokens/秒</div>
            </div>
          </div>
          
          {/* よくある問題 */}
          {analysisReport.commonIssues.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">⚠️ よく発生する問題</h4>
              <ul className="space-y-1">
                {analysisReport.commonIssues.map(([issue, count]) => (
                  <li key={issue} className="text-sm text-gray-600">
                    {issue} ({count}回)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* 詳細結果 */}
      {testResults.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">📝 詳細テスト結果</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="border-l-4 border-gray-200 pl-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">{result.scenario}</span>
                    <span className="text-gray-500 ml-2">{result.responseTime}ms</span>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    result.scores.overall >= 0.8 ? 'bg-green-100 text-green-800' :
                    result.scores.overall >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {Math.round(result.scores.overall * 100)}%
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-1">入力: {result.input}</div>
                <div className="text-sm mb-2">出力: {result.output}</div>
                {result.issues.length > 0 && (
                  <div className="text-xs text-red-600">
                    問題: {result.issues.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}