import { NextResponse } from 'next/server';

const PEXELS_API_KEY = 'pey9BByW8y7jblJ1lG9W9rUkPFvHedVmIBfU4OkgAFx1WBrkUG5rbC1E';

type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

const getImageSize = (aspectRatio: AspectRatio) => {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1280, height: 720 };
    case '4:3':
      return { width: 1024, height: 768 };
    case '1:1':
      return { width: 800, height: 800 };
    case '9:16':
      return { width: 720, height: 1280 };
    default:
      return { width: 1280, height: 720 };
  }
};

export async function POST(req: Request) {
  try {
    const { script, imageCount, aspectRatio, isReload } = await req.json();

    if (!script || !imageCount || !aspectRatio) {
      return NextResponse.json(
        { error: 'Missing required fields: script, imageCount, or aspectRatio' },
        { status: 400 }
      );
    }

    let parts: string[];
    if (isReload) {
      // For reload, use the script as the caption directly
      parts = [script];
    } else {
      // Split the script into parts for initial generation
      const sentences = script.split(/[.?!]/).filter(Boolean);
      const chunkSize = Math.ceil(sentences.length / imageCount);
      parts = [];
      for (let i = 0; i < sentences.length; i += chunkSize) {
        parts.push(sentences.slice(i, i + chunkSize).join('. ').trim());
      }
    }

    const images: { url: string, caption: string }[] = [];
    const { width, height } = getImageSize(aspectRatio as AspectRatio);

    for (const part of parts.slice(0, imageCount)) {
      const search = encodeURIComponent(part);
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${search}&per_page=1&orientation=${aspectRatio === '9:16' ? 'portrait' : aspectRatio === '1:1' ? 'square' : 'landscape'}`,
        {
          headers: {
            Authorization: PEXELS_API_KEY,
          },
        }
      );

      const data = await res.json();

      if (data.photos && data.photos.length > 0) {
        // Get the image URL that best matches our desired dimensions
        const photo = data.photos[0];
        let imageUrl = photo.src.medium;

        // Try to get the best quality image that matches our aspect ratio
        if (aspectRatio === '16:9' && photo.src.large2x) {
          imageUrl = photo.src.large2x;
        } else if (aspectRatio === '4:3' && photo.src.large) {
          imageUrl = photo.src.large;
        } else if (aspectRatio === '1:1' && photo.src.square) {
          imageUrl = photo.src.square;
        } else if (aspectRatio === '9:16' && photo.src.portrait) {
          imageUrl = photo.src.portrait;
        }

        images.push({ url: imageUrl, caption: part });
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'No images found from Pexels' }, { status: 404 });
    }

    return NextResponse.json({ images });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
} 