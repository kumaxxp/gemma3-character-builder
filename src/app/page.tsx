// src/app/page.tsx

export default function CharacterBuilder() {
  const [step, setStep] = useState<'select' | 'create' | 'test' | 'export'>('select')
  const [modelSize, setModelSize] = useState<'4b' | '12b'>('4b')
  const [character, setCharacter] = useState<Gemma3Character | null>(null)
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          🎭 Gemma3 Character Builder
        </h1>
        
        {/* モデル選択 */}
        {step === 'select' && (
          <ModelSelector
            onSelect={(size) => {
              setModelSize(size)
              setStep('create')
            }}
          />
        )}
        
        {/* キャラクター作成 */}
        {step === 'create' && (
          <CharacterWizard
            modelSize={modelSize}
            onComplete={(char) => {
              setCharacter(char)
              setStep('test')
            }}
          />
        )}
        
        {/* テスト */}
        {step === 'test' && character && (
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">キャラクター情報</h2>
              <CharacterPreview character={character} />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4">動作テスト</h2>
              <Gemma3Tester character={character} />
            </div>
          </div>
        )}
        
        {/* エクスポート */}
        {character && (
          <ExportPanel
            character={character}
            onExport={async () => {
              const response = await fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(character)
              })
              const data = await response.json()
              downloadJSON(data, `${character.name}_gemma3.json`)
            }}
          />
        )}
      </div>
    </div>
  )
}