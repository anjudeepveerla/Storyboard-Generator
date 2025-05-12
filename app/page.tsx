'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

interface AspectRatioOption {
  value: AspectRatio;
  label: string;
  dimensions: string;
  icon: string;
}

const aspectRatioOptions: AspectRatioOption[] = [
  { value: '16:9', label: 'Widescreen', dimensions: '1280x720', icon: '📺' },
  { value: '4:3', label: 'Standard', dimensions: '1024x768', icon: '🖼️' },
  { value: '1:1', label: 'Square', dimensions: '800x800', icon: '🔲' },
  { value: '9:16', label: 'Portrait', dimensions: '720x1280', icon: '📱' },
];

export default function Home() {
  const [scriptPrompt, setScriptPrompt] = useState('');
  const [script, setScript] = useState('');
  const [imageCount, setImageCount] = useState(3);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [loading, setLoading] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [images, setImages] = useState<{ url: string, caption: string }[]>([]);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ url: string, caption: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // Cleanup function for speech synthesis
  useEffect(() => {
    return () => {
      if (utterance) {
        window.speechSynthesis.cancel();
      }
    };
  }, [utterance]);

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  // Format script based on whether it should be bullet points
  const formatScript = (lines: string[]) => {
    const isBulletPoints = scriptPrompt.toLowerCase().includes('give in points') || 
                          lines.some(line => line.trim().startsWith('•') || 
                                           line.trim().startsWith('-') || 
                                           line.trim().startsWith('*'));

    if (isBulletPoints) {
      return lines.map(line => line.trim().replace(/^[•\-*]\s*/, '• ')); // Standardize bullet points
    } else {
      // Join lines with proper spacing and punctuation for narrative flow
      return [lines.map(line => line.trim()).join('. ')];
    }
  };

  const speakFullScript = (scriptLines: string[]) => {
    const formattedLines = formatScript(scriptLines);
    const fullText = formattedLines.join('. ');

    const newUtterance = new SpeechSynthesisUtterance(fullText);
    newUtterance.lang = "en-US";
    newUtterance.rate = 0.9; // Slightly slower for better clarity
    
    // Add event listeners
    newUtterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };
    
    newUtterance.onpause = () => {
      setIsPaused(true);
    };
    
    newUtterance.onresume = () => {
      setIsPaused(false);
    };
    
    newUtterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    newUtterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    setUtterance(newUtterance);
    window.speechSynthesis.speak(newUtterance);
  };

  const pauseSpeech = () => {
    if (utterance) {
      window.speechSynthesis.pause();
    }
  };

  const resumeSpeech = () => {
    if (utterance) {
      window.speechSynthesis.resume();
    }
  };

  const stopSpeech = () => {
    if (utterance) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const generateScriptFromIdea = async () => {
    if (!scriptPrompt.trim()) {
      setError('Please enter an idea first.');
      return;
    }

    setGeneratingScript(true);
    setError('');

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scriptPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate script');
      }

      setScript(data.script);
    } catch (err: any) {
      setError(err.message || 'Failed to generate script');
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError('Please enter a script.');
      return;
    }

    setError('');
    setLoading(true);
    setImages([]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, imageCount, aspectRatio }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate images');
      }

      setImages(data.images);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `scene-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError('Failed to download image');
    }
  };

  const ImageSkeleton = () => (
    <div className={`relative rounded-lg overflow-hidden mb-4 animate-pulse bg-gray-700
                    ${aspectRatio === '16:9' ? 'aspect-video' : ''}
                    ${aspectRatio === '4:3' ? 'aspect-[4/3]' : ''}
                    ${aspectRatio === '1:1' ? 'aspect-square' : ''}
                    ${aspectRatio === '9:16' ? 'aspect-[9/16]' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-shimmer" />
    </div>
  );

  // Split script into lines and filter out empty lines
  const scriptLines = script.split('\n').filter(line => line.trim());
  const formattedScriptLines = formatScript(scriptLines);
  const isBulletPoints = scriptPrompt.toLowerCase().includes('give in points') || 
                        scriptLines.some(line => line.trim().startsWith('•') || 
                                               line.trim().startsWith('-') || 
                                               line.trim().startsWith('*'));

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 flex flex-col">
      <div className="max-w-6xl mx-auto flex-grow">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text animate-pulse">
            Script to Storyboard Generator 🎬
          </h1>
          <p className="font-mono text-sm sm:text-base text-gray-400">
            Transform your script into a visual storyboard
          </p>
        </header>

        {/* Main Content */}
        <main className="space-y-8">
          {/* Script Generation Section */}
          <div className="w-full mb-4">
            <label className="block text-lg font-semibold mb-2 text-gray-300">
              Generate a Script from an Idea
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scriptPrompt}
                onChange={(e) => setScriptPrompt(e.target.value)}
                placeholder="Enter your idea (e.g., a city on Mars)..."
                className="flex-1 p-3 bg-gray-900 border-2 border-blue-500/30 rounded-lg
                         text-white placeholder-gray-500 focus:outline-none focus:border-blue-500
                         transition-all duration-300"
              />
              <button
                onClick={generateScriptFromIdea}
                disabled={generatingScript || !scriptPrompt.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg
                         text-white font-semibold transform transition-all duration-300
                         hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         disabled:hover:shadow-none"
              >
                {generatingScript ? 'Generating...' : '✨ Generate Script'}
              </button>
            </div>
          </div>

          {/* Script Display Section */}
          {scriptLines.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-6 border-2 border-blue-500/30">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-blue-400">Generated Script</h2>
                  {!isPlaying && !isPaused && (
                    <button
                      onClick={() => speakFullScript(scriptLines)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg
                               hover:bg-blue-500/30 transition-colors duration-300 text-sm"
                    >
                      🔊 Listen to Story
                    </button>
                  )}
                </div>

                <div className={`prose prose-invert max-w-none ${isBulletPoints ? 'space-y-2' : ''}`}>
                  {formattedScriptLines.map((line, index) => (
                    <p key={index} className={`text-gray-300 ${isBulletPoints ? 'ml-4' : ''}`}>
                      {line}
                    </p>
                  ))}
                </div>

                {(isPlaying || isPaused) && (
                  <div className="flex items-center justify-center gap-3 mt-4 border-t border-blue-500/20 pt-4">
                    {isPlaying && !isPaused && (
                      <button
                        onClick={pauseSpeech}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg
                                 hover:bg-blue-500/30 transition-colors duration-300 text-sm"
                      >
                        ⏸️ Pause
                      </button>
                    )}
                    {isPaused && (
                      <button
                        onClick={resumeSpeech}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg
                                 hover:bg-blue-500/30 transition-colors duration-300 text-sm"
                      >
                        ▶️ Resume
                      </button>
                    )}
                    <button
                      onClick={stopSpeech}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg
                               hover:bg-red-500/30 transition-colors duration-300 text-sm"
                    >
                      ⏹️ Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="relative">
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your script here..."
              className="w-full h-64 p-4 bg-gray-900 border-2 border-blue-500/30 rounded-lg 
                       text-white placeholder-gray-500 focus:outline-none focus:border-blue-500
                       transition-all duration-300 font-mono text-sm sm:text-base
                       shadow-lg shadow-blue-500/20"
            />
            <div className="absolute bottom-4 right-4 text-sm text-gray-500">
              {script.length}/1200 characters
            </div>
          </div>

          {/* Controls Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Image Count Selector */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-300">
                Number of Images
              </label>
              <select
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                className="w-full bg-gray-900 border-2 border-blue-500/30 rounded-lg px-4 py-2
                         text-white focus:outline-none focus:border-blue-500
                         transition-all duration-300"
              >
                {[...Array(25)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="block font-medium text-gray-300">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full bg-gray-900 border-2 border-blue-500/30 rounded-lg px-4 py-2
                         text-white focus:outline-none focus:border-blue-500
                         transition-all duration-300"
              >
                {aspectRatioOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label} ({option.dimensions})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-500 text-center p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={loading || !script.trim()}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg
                       text-white font-bold text-lg transform transition-all duration-300
                       hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                       disabled:hover:shadow-none relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading ? 'Generating...' : 'Generate Storyboard'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>

          {/* Generated Images Grid */}
          {(images.length > 0 || loading) && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">
                Your Storyboard
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  // Loading Skeletons
                  [...Array(imageCount)].map((_, index) => (
                    <motion.div
                      key={`skeleton-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative group overflow-hidden rounded-lg shadow-lg
                               transform transition-all duration-300 hover:scale-105
                               hover:shadow-blue-500/30 bg-gray-900 p-4"
                    >
                      <ImageSkeleton />
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-4 animate-pulse" />
                      <div className="h-10 bg-gray-700 rounded animate-pulse" />
                    </motion.div>
                  ))
                ) : (
                  // Actual Images
                  images.map((img, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative group overflow-hidden rounded-lg shadow-lg
                               transform transition-all duration-300 hover:scale-105
                               hover:shadow-blue-500/30 bg-gray-900 p-4"
                    >
                      <div 
                        className={`relative rounded-lg overflow-hidden mb-4 cursor-pointer
                                  ${aspectRatio === '16:9' ? 'aspect-video' : ''}
                                  ${aspectRatio === '4:3' ? 'aspect-[4/3]' : ''}
                                  ${aspectRatio === '1:1' ? 'aspect-square' : ''}
                                  ${aspectRatio === '9:16' ? 'aspect-[9/16]' : ''}`}
                        onClick={() => setSelectedImage(img)}
                      >
                        <Image
                          src={img.url}
                          alt={`Storyboard image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="text-sm italic mb-4 text-gray-300">
                        "{img.caption}"
                      </p>
                      <button
                        onClick={() => handleDownload(img.url, index)}
                        className="block w-full text-center bg-blue-500 text-white py-2 rounded-lg
                                 hover:bg-blue-600 transition-colors duration-300"
                      >
                        Download Image
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-gray-400">
        <p className="flex items-center justify-center gap-4">
          Developed by VAD from Lets_Vibecode
          <a
            href="https://www.instagram.com/lets_vibecode?igsh=MXV0MzVjaWxpNGx0NA=="
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 transition-colors duration-300 flex items-center gap-1"
          >
            <span>📸</span> Instagram
          </a>
        </p>
      </footer>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full bg-gray-900 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2
                         hover:bg-black/70 transition-colors z-10"
              >
                ✕
              </button>
              <div className="relative aspect-video">
                <Image
                  src={selectedImage.url}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>
              <p className="p-4 text-white text-center italic">
                "{selectedImage.caption}"
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 