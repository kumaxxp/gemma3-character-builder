// src/components/BackgroundEffectAnalyzer.tsx

export function BackgroundEffectAnalyzer({ character }: { character: Gemma3Character }) {
  const [testResults, setTestResults] = useState<AnalysisResult[]>([])
  
  // 背景設定の効果をテスト
  const analyzeEffectiveness = async () => {
    const testCases = [
      {
        category: '得意分野',
        inputs: character.abilities.strengths.map(s => ({
          text: `${s.area}について教えて`,
          expectedBehavior: '自信を持った返答'
        }))
      },
      {
        category: '苦手分野',
        inputs: character.abilities.weaknesses.map(w => ({
          text: `${w.area}はどう？`,
          expectedBehavior: w.reaction
        }))
      },
      {
        category: '背景関連',
        inputs: [
          {
            text: `仕事はどう？`,
            expectedBehavior: character.background.occupation + 'としての返答'
          }
        ]
      }
    ]
    
    const results = []
    for (const testCase of testCases) {
      for (const input of testCase.inputs) {
        // 背景ありプロンプト
        const withBackground = await testWithPrompt(
          EnhancedGemma3PromptBuilder.buildDetailedPrompt(character),
          input.text
        )
        
        // 背景なしプロンプト（比較用）
        const withoutBackground = await testWithPrompt(
          buildMinimalPrompt(character),
          input.text
        )
        
        results.push({
          category: testCase.category,
          input: input.text,
          expected: input.expectedBehavior,
          withBackground: withBackground.response,
          withoutBackground: withoutBackground.response,
          effectivenessScore: calculateEffectiveness(
            withBackground.response,
            withoutBackground.response,
            input.expectedBehavior
          )
        })
      }
    }
    
    setTestResults(results)
  }
  
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded">
        <h4 className="font-semibold text-amber-900">⚠️ Gemma3での背景設定の効果</h4>
        <ul className="mt-2 space-y-1 text-sm text-amber-800">
          <li>✓ <strong>4Bモデル</strong>：シンプルな設定のみ有効（1-2個の特徴）</li>
          <li>✓ <strong>12Bモデル</strong>：詳細な背景も反映可能（3-4個の特徴）</li>
          <li>⚠️ 過度に詳細な設定は無視される可能性</li>
          <li>⚠️ 具体例（Few-shot）の方が効果的な場合が多い</li>
        </ul>
      </div>
      
      <button
        onClick={analyzeEffectiveness}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        背景設定の効果を分析
      </button>
      
      {/* 結果表示 */}
      {testResults.length > 0 && (
        <EffectivenessReport results={testResults} />
      )}
    </div>
  )
}