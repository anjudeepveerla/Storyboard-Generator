import { NextResponse } from 'next/server';

// Using the API key
const API_KEY = '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';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'Script Generation App'
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a fast and efficient script writer. Create short, vivid bullet points that describe key visual moments. Keep each point concise and visual. Aim for 4-6 bullet points total."
          },
          {
            role: "user",
            content: `Create quick visual bullet points for: ${prompt}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', errorData);
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenRouter response:', data);

    let scriptContent = '';
    if (data.choices && data.choices[0]) {
      if (data.choices[0].message?.content) {
        scriptContent = data.choices[0].message.content;
      } else if (data.choices[0].text) {
        scriptContent = data.choices[0].text;
      } else if (typeof data.choices[0] === 'string') {
        scriptContent = data.choices[0];
      }
    }

    if (!scriptContent) {
      console.error('Unexpected API response format:', data);
      throw new Error('Could not extract script content from API response');
    }

    // Format the script to ensure consistent bullet points
    const formattedScript = scriptContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.startsWith('•') ? line : `• ${line}`)
      .join('\n');

    return NextResponse.json({ script: formattedScript });
  } catch (error) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate script' },
      { status: 500 }
    );
  }
} 