// src/components/BackgroundEditor.tsx

export function BackgroundEditor({ 
  character, 
  onChange,
  modelSize 
}: { 
  character: Gemma3Character
  onChange: (char: Gemma3Character) => void
  modelSize: '4b' | '12b'
}) {
  const maxSettings = modelSize === '4b' 
    ? { strengths: 1, weaknesses: 1, experiences: 1 }
    : { strengths: 2, weaknesses: 2, experiences: 3 }
  
  return (
    <div className="space-y-6">
      {/* 基本背景 */}
      <section>
        <h3 className="font-semibold mb-3">基本背景</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="職業（例：大学生）"
            value={character.background.occupation}
            onChange={(e) => updateBackground('occupation', e.target.value)}
            className="border rounded px-3 py-2"
          />
          <input
            placeholder="出身地（例：大阪）"
            value={character.background.origin}
            onChange={(e) => updateBackground('origin', e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </section>
      
      {/* 得意分野 */}
      <section>
        <h3 className="font-semibold mb-3">
          得意なこと（最大{maxSettings.strengths}個）
        </h3>
        {character.abilities.strengths.slice(0, maxSettings.strengths).map((s, i) => (
          <StrengthEditor
            key={i}
            strength={s}
            onChange={(updated) => updateStrength(i, updated)}
          />
        ))}
      </section>
      
      {/* 効果の可視化 */}
      <div className="bg-blue-50 p-4 rounded">
        <h4 className="font-semibold text-blue-900">プロンプトへの反映</h4>
        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
          {EnhancedGemma3PromptBuilder.buildDetailedPrompt(character)
            .split('\n').slice(0, 10).join('\n')}
          ...
        </pre>
      </div>
    </div>
  )
}