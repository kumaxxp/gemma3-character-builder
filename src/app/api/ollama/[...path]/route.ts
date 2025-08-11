import { NextRequest, NextResponse } from 'next/server'

const OLLAMA_BASE_URL = 'http://127.0.0.1:11434'

export async function GET(
  request: NextRequest,
  context: { params: { path?: string[] } }
) {
  try {
    // パスを構築（pathが存在しない場合も考慮）
    const pathSegments = context.params?.path || []
    const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments
    const url = `${OLLAMA_BASE_URL}/api/${path}`
    
    console.log('Proxying GET to:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`)
    }
    
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { path?: string[] } }
) {
  try {
    // パスを構築
    const pathSegments = context.params?.path || []
    const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments
    const url = `${OLLAMA_BASE_URL}/api/${path}`
    
    console.log('Proxying POST to:', url)
    
    const body = await request.json()
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ollama returned ${response.status}: ${errorText}`)
    }
    
    // ストリーミングレスポンスの処理
    if (path === 'generate' && body.stream === true) {
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader for streaming')
      }
      
      const stream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
          } finally {
            controller.close()
          }
        },
      })
      
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }
    
    // 通常のJSONレスポンス
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}