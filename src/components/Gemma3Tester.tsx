// src/components/Gemma3Tester.tsx

export function Gemma3Tester({ character }: { character: Gemma3Character }) {
  const [testMode, setTestMode] = useState<'simple' | 'conversation'>('simple')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  
  // プリセットテストケース（Gemma3の特性を考慮）
  const testCases = {
    greeting: ['こんにちは', 'はじめまして', 'おはよう'],
    question: ['今日何してた？', 'これどう思う？', 'なんで？'],
    reaction: ['すごいね！', 'えー、嘘でしょ', 'なるほど'],
    joke: ['ボケて', '面白いこと言って', 'ダジャレ言って']
  }
  
  // バッチテスト機能
  const runBatchTest = async () => {
    const results = []
    
    for (const [category, inputs] of Object.entries(testCases)) {
      for (const input of inputs) {
        const result = await testSingleInput(input)
        results.push({
          category,
          input,
          ...result,
          // Gemma3特有の品質チェック
          qualityCheck: {
            lengthOK: result.output.length <= 50,
            hasEndingStyle: character.speechStyle.sentenceEndings
              .some(ending => result.output.includes(ending)),
            responseTime: result.responseTime < 2000, // 2秒以内
            coherent: !result.output.includes('<end_of_turn>') // タグ漏れチェック
          }
        })
      }
    }
    
    setTestResults(results)
    return calculateQualityScore(results)
  }
  
  // Ollama直接呼び出し（API経由）
  const testSingleInput = async (input: string) => {
    const startTime = Date.now()
    
    const response = await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: character.ollamaConfig.endpoint,
        model: character.ollamaConfig.model,
        prompt: Gemma3PromptBuilder.buildCharacterPrompt(character)
          .replace('[USER_INPUT]', input),
        stream: false,
        options: {
          temperature: character.ollamaConfig.temperature,
          top_k: character.ollamaConfig.top_k,
          top_p: character.ollamaConfig.top_p,
          repeat_penalty: 1.0, // 必須
          num_predict: character.ollamaConfig.max_tokens,
          stop: ['<end_of_turn>']
        }
      })
    })
    
    const data = await response.json()
    
    return {
      output: data.response,
      responseTime: Date.now() - startTime,
      tokenCount: data.eval_count || 0,
      modelLoadTime: data.load_duration || 0
    }
  }
  
  return (
    <div className="space-y-4">
      {/* モデルサイズ別の推奨事項表示 */}
      <div className="bg-blue-50 p-4 rounded">
        <h4 className="font-semibold">
          {character.modelSize === '4b' ? 'Gemma3 4B' : 'Gemma3 12B'}モデル使用中
        </h4>
        <ul className="text-sm mt-2 space-y-1">
          {character.modelSize === '4b' ? (
            <>
              <li>✓ 高速レスポンス（90-120 tokens/s）</li>
              <li>✓ メモリ使用量: 約2.6GB（INT4）</li>
              <li>⚠️ 複雑な文脈理解に制限あり</li>
            </>
          ) : (
            <>
              <li>✓ 高い文脈理解能力</li>
              <li>✓ 安定したキャラクター維持</li>
              <li>⚠️ レスポンス速度: 35-50 tokens/s</li>
            </>
          )}
        </ul>
      </div>
      
      {/* テストモード選択 */}
      <div className="flex gap-2">
        <button
          onClick={() => setTestMode('simple')}
          className={`px-4 py-2 rounded ${
            testMode === 'simple' ? 'bg-purple-600 text-white' : 'bg-gray-200'
          }`}
        >
          単発テスト
        </button>
        <button
          onClick={() => setTestMode('conversation')}
          className={`px-4 py-2 rounded ${
            testMode === 'conversation' ? 'bg-purple-600 text-white' : 'bg-gray-200'
          }`}
        >
          会話テスト
        </button>
      </div>
      
      {/* バッチテスト */}
      <div className="border-t pt-4">
        <button
          onClick={runBatchTest}
          className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700"
        >
          🚀 全パターンテスト実行（{Object.values(testCases).flat().length}件）
        </button>
      </div>
      
      {/* テスト結果表示 */}
      {testResults.length > 0 && (
        <TestResultsPanel results={testResults} character={character} />
      )}
    </div>
  )
}