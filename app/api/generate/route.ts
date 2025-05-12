import { NextResponse } from 'next/server';

const PEXELS_API_KEY = 'pey9BByW8y7jblJ1lG9W9rUkPFvHedVmIBfU4OkgAFx1WBrkUG5rbC1E';

type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

interface PexelsPhoto {
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export async function POST(req: Request) {
  try {
    const { script, imageCount, aspectRatio } = await req.json();

    if (!script) {
      return NextResponse.json(
        { error: 'Script is required' },
        { status: 400 }
      );
    }

    const images = [];
    const scriptLines = script.split('\n').filter(line => line.trim());
    const linesToGenerate = Math.min(imageCount, scriptLines.length);

    for (let i = 0; i < linesToGenerate; i++) {
      const searchQuery = encodeURIComponent(scriptLines[i]);
      const orientation = getOrientation(aspectRatio as AspectRatio);
      
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1&orientation=${orientation}`,
        {
          headers: {
            'Authorization': PEXELS_API_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Pexels API error:', errorData);
        throw new Error('Failed to fetch image from Pexels');
      }

      const data = await response.json();
      
      if (data.photos && data.photos.length > 0) {
        const photo = data.photos[0] as PexelsPhoto;
        const imageUrl = getBestImageUrl(photo, aspectRatio as AspectRatio);
        
        images.push({
          url: imageUrl,
          caption: scriptLines[i]
        });
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images found for the given script' },
        { status: 404 }
      );
    }

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate images' },
      { status: 500 }
    );
  }
}

function getOrientation(aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case '9:16':
      return 'portrait';
    case '16:9':
      return 'landscape';
    case '1:1':
      return 'square';
    default:
      return 'landscape';
  }
}

function getBestImageUrl(photo: PexelsPhoto, aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case '16:9':
      return photo.src.landscape || photo.src.large2x;
    case '9:16':
      return photo.src.portrait || photo.src.large;
    case '1:1':
      return photo.src.large; // Pexels doesn't have square format, we'll crop client-side
    default:
      return photo.src.large2x || photo.src.large;
  }
} 