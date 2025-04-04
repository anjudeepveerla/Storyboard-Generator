import { NextResponse } from 'next/server';

const PEXELS_API_KEY = 'pey9BByW8y7jblJ1lG9W9rUkPFvHedVmIBfU4OkgAFx1WBrkUG5rbC1E';

export async function POST(request: Request) {
  try {
    const { script } = await request.json();

    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        { error: 'Invalid script input' },
        { status: 400 }
      );
    }

    // Encode the prompt for URL safety
    const encodedPrompt = encodeURIComponent(script);

    // Fetch images from Pexels API
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodedPrompt}&per_page=3`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from Pexels API' },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Validate the response data
    if (!data.photos || !Array.isArray(data.photos)) {
      return NextResponse.json(
        { error: 'Invalid response from Pexels API' },
        { status: 500 }
      );
    }

    // Extract medium-sized image URLs from the results
    const images = data.photos
      .map((photo: any) => photo.src.medium)
      .filter(Boolean); // Remove any null/undefined values

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images found for the given prompt' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      images,
      message: 'Images generated successfully'
    });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 