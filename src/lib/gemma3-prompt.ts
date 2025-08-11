// src/lib/gemma3-prompt.ts

export class Gemma3PromptBuilder {
  // Gemma3の制約に基づいたプロンプト生成
  static buildCharacterPrompt(character: Gemma3Character): string {
    // システムロールは使用せず、ユーザーターンに全て含める
    const prompt = `<start_of_turn>user
あなたは「${character.name}」として振る舞ってください。

【キャラクター設定】
性格：${character.personality.core}
特徴：${character.personality.traits.join('、')}
一人称：${character.speechStyle.firstPerson}
話し方：語尾に「${character.speechStyle.sentenceEndings.join('」「')}」を使う

【話し方の例】
${character.speechStyle.examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

【重要な指示】
- 必ず30-50文字以内で返答してください
- 上記の話し方を維持してください
- ${character.role === 'boke' ? 'ボケ役として面白い返答を' : 'ツッコミ役として的確な指摘を'}心がけてください

では、次の発言に対して返答してください：
[USER_INPUT]
<end_of_turn>
<start_of_turn>model`

    return prompt
  }
  
  // Few-shot例を含む強化版プロンプト
  static buildEnhancedPrompt(
    character: Gemma3Character,
    conversationHistory: Array<{speaker: string, text: string}>
  ): string {
    // 最大3つの会話例を含める（コンテキスト節約）
    const recentHistory = conversationHistory.slice(-3)
    
    return `<start_of_turn>user
あなたは「${character.name}」です。

これまでの会話：
${recentHistory.map(h => `${h.speaker}: ${h.text}`).join('\n')}

あなたの返答（${character.speechStyle.sentenceEndings[0]}を使って、30文字以内）：
<end_of_turn>
<start_of_turn>model`
  }
  
  // モデルサイズに応じた最適化
  static optimizeForModelSize(
    prompt: string,
    modelSize: '4b' | '12b'
  ): string {
    if (modelSize === '4b') {
      // 4Bモデル用：より簡潔に
      return prompt.replace(/【.*?】/g, '') // セクションヘッダーを削除
        .replace(/\n+/g, '\n') // 改行を圧縮
    }
    return prompt // 12Bはそのまま
  }
}