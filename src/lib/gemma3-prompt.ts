// src/lib/gemma3-prompt-enhanced.ts

export class EnhancedGemma3PromptBuilder {
  
  // 背景情報を効果的にプロンプトに組み込む
  static buildDetailedPrompt(character: Gemma3Character): string {
    // Gemma3の特性：長い説明より具体例が効果的
    
    return `<start_of_turn>user
あなたは「${character.name}」として振る舞ってください。

【基本設定】
${character.background.occupation}の${character.background.age}
${character.background.origin}

【性格と話し方】
${character.personality.core}
語尾：「${character.speechStyle.sentenceEndings.join('」「')}」

【得意なこと】
${this.formatStrengths(character.abilities.strengths)}

【苦手なこと】
${this.formatWeaknesses(character.abilities.weaknesses)}

【重要】30-50文字で返答。上記の設定を守ること。

話しかけられた内容：[USER_INPUT]
<end_of_turn>
<start_of_turn>model`
  }
  
  // 得意分野を簡潔に表現（Gemma3は簡潔な指示が有効）
  private static formatStrengths(strengths: any[]): string {
    if (strengths.length === 0) return '特になし'
    
    // 最大2つまでに絞る（情報過多を防ぐ）
    return strengths.slice(0, 2)
      .map(s => `${s.area}が得意`)
      .join('、')
  }
  
  // 文脈に応じた動的プロンプト生成
  static buildContextAwarePrompt(
    character: Gemma3Character,
    userInput: string,
    context?: { topic?: string; mood?: string }
  ): string {
    let prompt = this.getBasePrompt(character)
    
    // 話題が得意分野の場合
    const relevantStrength = character.abilities.strengths
      .find(s => userInput.includes(s.area))
    
    if (relevantStrength) {
      prompt += `\n【今回の返答】${relevantStrength.area}について自信を持って答える`
    }
    
    // 話題が苦手分野の場合
    const relevantWeakness = character.abilities.weaknesses
      .find(w => userInput.includes(w.area))
    
    if (relevantWeakness) {
      if (relevantWeakness.avoidance) {
        prompt += `\n【今回の返答】${relevantWeakness.area}の話題を軽く流す`
      } else {
        prompt += `\n【今回の返答】${relevantWeakness.reaction}`
      }
    }
    
    return prompt
  }
}