import { useEffect, useRef, useState } from 'react';
import type { Board, OrderMode } from '../types';

interface UsePracticeSessionOptions {
  board: Board;
  duration: number;
  orderMode: OrderMode;
  practiceCount: number;
  skipPracticedImages: boolean;
  drawnImages: string[];
  onMarkDrawn: (url: string) => void;
}

const getPracticeImages = (
  board: Board,
  orderMode: OrderMode,
  skipPracticedImages: boolean,
  drawnImages: string[]
) => {
  const available = skipPracticedImages
    ? board.images.filter(img => !drawnImages.includes(img))
    : [...board.images];
  let finalOrder = [...available];

  if (orderMode === 'REVERSE') {
    finalOrder = finalOrder.reverse();
  } else if (orderMode === 'RANDOM') {
    finalOrder = finalOrder.sort(() => Math.random() - 0.5);
  }

  if (finalOrder.length === 0 && skipPracticedImages) {
    finalOrder = [...board.images];
    if (orderMode === 'REVERSE') finalOrder = finalOrder.reverse();
    else if (orderMode === 'RANDOM') finalOrder = finalOrder.sort(() => Math.random() - 0.5);
  }

  return finalOrder;
};

export function usePracticeSession({
  board,
  duration,
  orderMode,
  practiceCount,
  skipPracticedImages,
  drawnImages,
  onMarkDrawn,
}: UsePracticeSessionOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [images] = useState<string[]>(() => (
    getPracticeImages(board, orderMode, skipPracticedImages, drawnImages)
  ));
  const completedImagesRef = useRef<Set<string>>(new Set());
  const [completedPracticeCount, setCompletedPracticeCount] = useState(0);
  const targetPracticeCount = Math.min(practiceCount, images.length);
  const practiceThresholdSeconds = duration * 0.8;

  const resetTimer = () => setTimeLeft(duration);

  const completeImage = (image: string) => {
    if (completedImagesRef.current.has(image)) return;
    completedImagesRef.current.add(image);
    setCompletedPracticeCount(completedImagesRef.current.size);
  };

  const handleLeaveImage = (index: number) => {
    const image = images[index];
    if (!image) return;

    const activeSeconds = duration - timeLeft;
    if (activeSeconds < practiceThresholdSeconds || completedImagesRef.current.has(image)) {
      return;
    }

    completeImage(image);
    onMarkDrawn(image);
  };

  const hasReachedTarget = () => (
    targetPracticeCount > 0 && completedImagesRef.current.size >= targetPracticeCount
  );

  useEffect(() => {
    if (!isPlaying || images.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, images.length]);

  return {
    images,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    setIsPlaying,
    timeLeft,
    targetPracticeCount,
    completedPracticeCount,
    resetTimer,
    completeImage,
    handleLeaveImage,
    hasReachedTarget,
  };
}
