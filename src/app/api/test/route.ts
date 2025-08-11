import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags')
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      modelCount: data.models?.length || 0,
      models: data.models?.map((m: any) => m.name) || []
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    })
  }
}