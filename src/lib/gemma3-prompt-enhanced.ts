// src/lib/gemma3-prompt-enhanced.ts

export class EnhancedGemma3PromptBuilder {
  
  // Gemma3に最適化されたプロンプト生成
  static buildOptimizedPrompt(character: Gemma3Character, userInput: string): string {
    // システムロール非対応のため、すべてをユーザーターンに含める
    const corePrompt = this.buildCoreCharacterPrompt(character)
    const fewShotExamples = this.generateContextualFewShot(character, userInput)
    const constraintsAndRules = this.buildConstraints(character)
    
    return `<start_of_turn>user
${corePrompt}

【発話例】
${fewShotExamples}

${constraintsAndRules}

ユーザーの発言: ${userInput}

上記のキャラクター設定に従って、30-50文字で${character.name}として返答してください。
<end_of_turn>
<start_of_turn>model`
  }
  
  // コアキャラクター設定（モデルサイズに応じて最適化）
  private static buildCoreCharacterPrompt(character: Gemma3Character): string {
    const isSmallModel = character.modelSize === '4b'
    
    let prompt = `あなたは「${character.name}」です。`
    
    // 4Bモデル：最小限の情報のみ
    if (isSmallModel) {
      prompt += `
性格: ${character.personality.core}
話し方: ${character.speechStyle.sentenceEndings[0]}で終わる
職業: ${character.background.occupation}`
      
      // 得意分野は1つだけ
      if (character.abilities.strengths.length > 0) {
        prompt += `
得意: ${character.abilities.strengths[0].area}`
      }
    } else {
      // 12Bモデル：より詳細な設定
      prompt += `
性格: ${character.personality.core}
特徴: ${character.personality.traits.slice(0, 3).join('、')}
話し方: 語尾は「${character.speechStyle.sentenceEndings.join('」「')}」
一人称: ${character.speechStyle.firstPerson}
背景: ${character.background.occupation}、${character.background.origin}、${character.background.age}`
      
      // 得意・不得意を含める
      if (character.abilities.strengths.length > 0) {
        prompt += `
得意分野: ${character.abilities.strengths.slice(0, 2).map(s => s.area).join('、')}`
      }
      
      if (character.abilities.weaknesses.length > 0) {
        prompt += `
苦手分野: ${character.abilities.weaknesses.slice(0, 2).map(w => `${w.area}（${w.reaction}）`).join('、')}`
      }
    }
    
    return prompt
  }
  
  // 文脈に応じたFew-shot例の生成
  private static generateContextualFewShot(character: Gemma3Character, userInput: string): string {
    const examples = []
    
    // 基本的な挨拶例は必ず含める
    examples.push(`ユーザー: こんにちは
${character.name}: こんにちは${character.speechStyle.sentenceEndings[0]}`)
    
    // ユーザー入力に関連する例を動的に生成
    const relevantStrength = character.abilities.strengths.find(s => 
      userInput.toLowerCase().includes(s.area.toLowerCase())
    )
    
    if (relevantStrength) {
      examples.push(`ユーザー: ${relevantStrength.area}について教えて
${character.name}: ${relevantStrength.area}なら任せて${character.speechStyle.sentenceEndings[0]}`)
    }
    
    const relevantWeakness = character.abilities.weaknesses.find(w => 
      userInput.toLowerCase().includes(w.area.toLowerCase())
    )
    
    if (relevantWeakness) {
      examples.push(`ユーザー: ${relevantWeakness.area}はどう？
${character.name}: ${relevantWeakness.reaction}${character.speechStyle.sentenceEndings[0]}`)
    }
    
    // ロール固有の例を追加
    if (character.role === 'boke') {
      examples.push(`ユーザー: 何か面白いこと言って
${character.name}: えーっと...${character.speechStyle.sentenceEndings[0]}`)
    } else if (character.role === 'tsukkomi') {
      examples.push(`ユーザー: それはおかしいよ
${character.name}: そうそう、それ言いたかった${character.speechStyle.sentenceEndings[0]}`)
    }
    
    return examples.slice(0, character.modelSize === '4b' ? 3 : 5).join('\n\n')
  }
  
  // 制約とルール（Gemma3に効果的な形式）
  private static buildConstraints(character: Gemma3Character): string {
    return `
【重要なルール】
- 必ず30-50文字で返答する
- ${character.name}の性格を一貫して保つ
- 語尾「${character.speechStyle.sentenceEndings[0]}」を忘れずに
- 自然な日本語で答える
- <end_of_turn>などのタグは出力しない`
  }
  
  // 会話履歴を含むプロンプト（連続会話用）
  static buildConversationPrompt(
    character: Gemma3Character, 
    conversationHistory: Array<{role: 'user' | 'assistant', content: string}>,
    newUserInput: string
  ): string {
    const corePrompt = this.buildCoreCharacterPrompt(character)
    
    // 直近の会話履歴（Gemma3のコンテキスト制限を考慮）
    const maxHistory = character.modelSize === '4b' ? 3 : 6
    const recentHistory = conversationHistory.slice(-maxHistory)
    
    let conversationContext = ''
    if (recentHistory.length > 0) {
      conversationContext = `
【これまでの会話】
${recentHistory.map(msg => 
  msg.role === 'user' ? `ユーザー: ${msg.content}` : `${character.name}: ${msg.content}`
).join('\n')}
`
    }
    
    return `<start_of_turn>user
${corePrompt}
${conversationContext}
【重要】30-50文字で、${character.name}として一貫した性格で返答してください。

ユーザーの新しい発言: ${newUserInput}
<end_of_turn>
<start_of_turn>model`
  }
  
  // デバッグ用：プロンプトの長さと構造をチェック
  static analyzePrompt(prompt: string): {
    totalLength: number
    estimatedTokens: number
    sections: string[]
    warnings: string[]
  } {
    const warnings = []
    const sections = prompt.split('【').map(s => s.split('】')[0]).filter(Boolean)
    
    // 日本語の大まかなトークン推定（1文字≈1.5トークン）
    const estimatedTokens = Math.ceil(prompt.length * 1.5)
    
    if (estimatedTokens > 1000) {
      warnings.push('プロンプトが長すぎます（1000トークン超過予想）')
    }
    
    if (!prompt.includes('<start_of_turn>')) {
      warnings.push('Gemma3形式のタグが含まれていません')
    }
    
    return {
      totalLength: prompt.length,
      estimatedTokens,
      sections,
      warnings
    }
  }
}