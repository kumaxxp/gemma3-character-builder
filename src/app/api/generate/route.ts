// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

export async function POST(request: NextRequest) {
  console.log('[Generate API] POST request received')
  
  try {
    const body = await request.json()
    
    // デバッグログ
    console.log('[Generate API] Model:', body.model || 'not specified')
    console.log('[Generate API] Prompt preview:', body.prompt?.substring(0, 100) + '...')
    console.log('[Generate API] Stream:', body.stream || false)
    
    // モデルが指定されていない場合のデフォルト
    if (!body.model) {
      body.model = 'gemma3:4b'
      console.log('[Generate API] Using default model: gemma3:4b')
    }
    
    // Ollamaのgenerate APIを呼び出し
    const ollamaUrl = `${OLLAMA_BASE_URL}/api/generate`
    console.log('[Generate API] Calling Ollama at:', ollamaUrl)
    
    const ollamaResponse = await fetch(ollamaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    console.log('[Generate API] Ollama response status:', ollamaResponse.status)
    
    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text()
      console.error('[Generate API] Ollama error:', errorText.substring(0, 500))
      
      return NextResponse.json(
        { 
          error: 'Ollama generation failed',
          details: errorText,
          status: ollamaResponse.status
        },
        { status: ollamaResponse.status }
      )
    }
    
    // ストリーミングレスポンスの場合
    if (body.stream === true) {
      console.log('[Generate API] Handling streaming response')
      
      // Ollamaのストリーミングレスポンスをそのまま転送
      return new NextResponse(ollamaResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }
    
    // 通常のJSONレスポンスの場合
    const data = await ollamaResponse.json()
    console.log('[Generate API] Response received')
    console.log('[Generate API] Response preview:', data.response?.substring(0, 100) + '...')
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('[Generate API] Error:', error)
    
    // エラーレスポンス
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GETメソッド（テスト用）
export async function GET() {
  console.log('[Generate API] GET request received (test)')
  
  return NextResponse.json({
    message: 'Generate API is working',
    endpoint: '/api/generate',
    method: 'POST',
    timestamp: new Date().toISOString()
  })
}