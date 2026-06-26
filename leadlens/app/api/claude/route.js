import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { system, message } = await request.json()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system,
        messages: [{ role: 'user', content: message }],
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'API error' }, { status: response.status })
    }
    return NextResponse.json({ result: data.content?.[0]?.text || '' })
  } catch (error) {
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 })
  }
}