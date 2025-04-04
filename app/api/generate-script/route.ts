import { NextResponse } from 'next/server';
import { generateScriptFromPrompt } from '../../../utils/generateScript';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Please provide a prompt' },
        { status: 400 }
      );
    }

    if (prompt.length > 200) {
      return NextResponse.json(
        { error: 'Prompt is too long. Please keep it under 200 characters.' },
        { status: 400 }
      );
    }

    const generatedScript = await generateScriptFromPrompt(prompt);

    if (!generatedScript) {
      return NextResponse.json(
        { error: 'Failed to generate script. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ script: generatedScript });
  } catch (error: any) {
    console.error('Script generation error:', error);
    
    // Handle specific API errors
    if (error.message.includes('401')) {
      return NextResponse.json(
        { error: 'API key is invalid or missing. Please check your configuration.' },
        { status: 401 }
      );
    }
    
    if (error.message.includes('429')) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate script. Please try again.' },
      { status: 500 }
    );
  }
} 