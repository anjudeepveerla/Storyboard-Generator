import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = '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';

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
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Script Generation App'
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct",
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
        max_tokens: 500,
        top_p: 0.8,
        frequency_penalty: 0,
        presence_penalty: 0,
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