// src/lib/character-optimization.ts

export class CharacterOptimizer {
  // モデルサイズに応じた設定の最適化
  static optimizeForModel(
    character: Gemma3Character,
    modelSize: '4b' | '12b'
  ): Gemma3Character {
    
    if (modelSize === '4b') {
      // 4Bモデル：最小限の設定に絞る
      return {
        ...character,
        background: {
          ...character.background,
          experiences: character.background.experiences.slice(0, 1) // 1つだけ
        },
        abilities: {
          strengths: character.abilities.strengths.slice(0, 1),     // 得意1つ
          weaknesses: character.abilities.weaknesses.slice(0, 1),   // 苦手1つ
          interests: character.abilities.interests.slice(0, 2)      // 興味2つ
        }
      }
    }
    
    // 12Bモデル：より多くの設定を保持
    return {
      ...character,
      background: {
        ...character.background,
        experiences: character.background.experiences.slice(0, 3)
      },
      abilities: {
        strengths: character.abilities.strengths.slice(0, 2),
        weaknesses: character.abilities.weaknesses.slice(0, 2),
        interests: character.abilities.interests.slice(0, 4)
      }
    }
  }
  
  // Few-shot例として背景を活用
  static generateExamplesFromBackground(
    character: Gemma3Character
  ): string[] {
    const examples = []
    
    // 得意分野での返答例
    character.abilities.strengths.forEach(s => {
      examples.push(
        `Q: ${s.area}について
A: ${s.area}なら任せて！${character.speechStyle.sentenceEndings[0]}`
      )
    })
    
    // 苦手分野での返答例
    character.abilities.weaknesses.forEach(w => {
      examples.push(
        `Q: ${w.area}は？
A: ${w.reaction}${character.speechStyle.sentenceEndings[0]}`
      )
    })
    
    return examples
  }
}