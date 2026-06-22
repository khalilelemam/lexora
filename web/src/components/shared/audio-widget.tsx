'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioWidgetProps {
  src: string;
}

export function AudioWidget({ src }: AudioWidgetProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const setAudioTime = () => {
      setProgress(audio.currentTime);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);

    // Auto-play on mount
    audio.play().then(() => setIsPlaying(true)).catch(console.error);

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = Number(e.target.value);
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-24 right-6 z-[100] flex items-center gap-3 border-2 border-[#1b2021] bg-[#f3edd7] px-3 py-2 shadow-[4px_4px_0_0_#1b2021]">
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 items-center justify-center border-2 border-[#1b2021] bg-[#a6a867] text-[#1b2021] transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#1b2021] active:translate-y-0 active:shadow-none"
      >
        {isPlaying ? <Pause className="h-4 w-4" strokeWidth={2.5} /> : <Play className="h-4 w-4 ml-0.5" strokeWidth={2.5} />}
      </button>

      <div className="flex w-32 flex-col gap-1.5">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#1b2021] tabular-nums">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={handleSeek}
          className="h-2 w-full appearance-none border-2 border-[#1b2021] bg-[#e3dcc2] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#1b2021] [&::-webkit-slider-thumb]:bg-[#1b2021] hover:cursor-grab active:cursor-grabbing"
        />
      </div>

      <button
        onClick={toggleMute}
        className="flex h-8 w-8 items-center justify-center border-2 border-[#1b2021] bg-white text-[#1b2021] transition-transform hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#1b2021] active:translate-y-0 active:shadow-none"
      >
        {isMuted ? <VolumeX className="h-4 w-4" strokeWidth={2.5} /> : <Volume2 className="h-4 w-4" strokeWidth={2.5} />}
      </button>
    </div>
  );
}
