import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import getStroke from 'perfect-freehand';
import { saveDrawingImage } from '../utils/SketchrefDb';

type StrokePoint = [number, number, number];
export type DrawingTool = 'brush' | 'eraser';

interface UseDrawingCanvasOptions {
  boardId: string;
  images: string[];
  onMarkDrawn: (url: string) => void;
  onPersistedImage?: (url: string) => void;
}

export function useDrawingCanvas({
  boardId,
  images,
  onMarkDrawn,
  onPersistedImage,
}: UseDrawingCanvasOptions) {
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentImageHasDrawingRef = useRef(false);
  const activeStrokeImageRef = useRef<ImageData | null>(null);
  const strokePointsRef = useRef<StrokePoint[]>([]);
  const [isDrawingBoardOpen, setIsDrawingBoardOpen] = useState(false);
  const [isDrawingStrokeActive, setIsDrawingStrokeActive] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<string[]>([]);
  const [redoDrawingHistory, setRedoDrawingHistory] = useState<string[]>([]);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('brush');
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState('#111111');
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [isDrawingToolbarCollapsed, setIsDrawingToolbarCollapsed] = useState(false);

  const getCanvasContext = () => {
    const canvas = drawingCanvasRef.current;
    return canvas?.getContext('2d') || null;
  };

  const captureDrawingSnapshot = () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  };

  const restoreDrawingSnapshot = (snapshot: string) => {
    const canvas = drawingCanvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(image, 0, 0, rect.width, rect.height);
    };
    image.src = snapshot;
  };

  const resetDrawingBoard = () => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (canvas && ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    activeStrokeImageRef.current = null;
    strokePointsRef.current = [];
    currentImageHasDrawingRef.current = false;
    setIsDrawingStrokeActive(false);
    setDrawingHistory([]);
    setRedoDrawingHistory([]);
  };

  const isDrawingCanvasBlank = () => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return true;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] !== 0) return false;
    }
    return true;
  };

  const persistCurrentDrawing = (index: number) => {
    const image = images[index];
    if (!image || !currentImageHasDrawingRef.current || isDrawingCanvasBlank()) return;

    const snapshot = captureDrawingSnapshot();
    if (!snapshot) return;

    void saveDrawingImage(boardId, image, snapshot);
    onPersistedImage?.(image);
    onMarkDrawn(image);
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    return [
      e.clientX - rect.left,
      e.clientY - rect.top,
      pressure,
    ] satisfies StrokePoint;
  };

  const restoreActiveStrokeBase = () => {
    const ctx = getCanvasContext();
    const imageData = activeStrokeImageRef.current;
    if (!ctx || !imageData) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
  };

  const drawFreehandStroke = (points: StrokePoint[]) => {
    const ctx = getCanvasContext();
    if (!ctx || points.length === 0) return;

    const outline = getStroke(points, {
      size: brushSize,
      thinning: 0.65,
      smoothing: 0.65,
      streamline: 0.45,
      simulatePressure: false,
    });
    if (outline.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = drawingTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = brushColor;
    ctx.globalAlpha = drawingTool === 'eraser' ? 1 : brushOpacity;
    ctx.beginPath();
    ctx.moveTo(outline[0][0], outline[0][1]);
    for (const [x, y] of outline.slice(1)) {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const handleDrawingPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    const canvas = drawingCanvasRef.current;
    const ctx = getCanvasContext();
    if (!point || !canvas || !ctx) return;

    const snapshot = captureDrawingSnapshot();
    if (snapshot) {
      setDrawingHistory(prev => [...prev.slice(-29), snapshot]);
      setRedoDrawingHistory([]);
    }

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    currentImageHasDrawingRef.current = true;
    activeStrokeImageRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    strokePointsRef.current = [point];
    setIsDrawingStrokeActive(true);
    drawFreehandStroke(strokePointsRef.current);
  };

  const handleDrawingPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingStrokeActive || strokePointsRef.current.length === 0) return;
    const point = getCanvasPoint(e);
    if (!point) return;

    e.preventDefault();
    strokePointsRef.current = [...strokePointsRef.current, point];
    restoreActiveStrokeBase();
    drawFreehandStroke(strokePointsRef.current);
  };

  const endDrawingStroke = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e && isDrawingStrokeActive) {
      const point = getCanvasPoint(e);
      if (point && strokePointsRef.current.length > 0) {
        strokePointsRef.current = [...strokePointsRef.current, point];
        restoreActiveStrokeBase();
        drawFreehandStroke(strokePointsRef.current);
      }
    }
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    activeStrokeImageRef.current = null;
    strokePointsRef.current = [];
    setIsDrawingStrokeActive(false);
  };

  const undoDrawing = () => {
    const snapshot = captureDrawingSnapshot();
    setDrawingHistory(prev => {
      const previous = prev[prev.length - 1];
      if (!previous) return prev;
      if (snapshot) {
        setRedoDrawingHistory(next => [snapshot, ...next].slice(0, 30));
      }
      restoreDrawingSnapshot(previous);
      return prev.slice(0, -1);
    });
  };

  const redoDrawing = () => {
    const snapshot = captureDrawingSnapshot();
    setRedoDrawingHistory(prev => {
      const nextSnapshot = prev[0];
      if (!nextSnapshot) return prev;
      if (snapshot) {
        setDrawingHistory(next => [...next.slice(-29), snapshot]);
      }
      restoreDrawingSnapshot(nextSnapshot);
      return prev.slice(1);
    });
  };

  const clearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    const ctx = getCanvasContext();
    const snapshot = captureDrawingSnapshot();
    if (!canvas || !ctx || !snapshot) return;

    setDrawingHistory(prev => [...prev.slice(-29), snapshot]);
    setRedoDrawingHistory([]);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  useEffect(() => {
    if (!isDrawingBoardOpen) return;

    const resizeCanvas = () => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return;

      const snapshot = captureDrawingSnapshot();
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (snapshot) {
        restoreDrawingSnapshot(snapshot);
      }
    };

    const frameId = window.requestAnimationFrame(resizeCanvas);
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isDrawingBoardOpen]);

  useEffect(() => {
    if (!isDrawingBoardOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = e.ctrlKey || e.metaKey;
      if (!isModifierPressed) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        redoDrawing();
      } else if (key === 'z') {
        e.preventDefault();
        undoDrawing();
      } else if (key === 'y') {
        e.preventDefault();
        redoDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingHistory, isDrawingBoardOpen, redoDrawingHistory]);

  return {
    drawingCanvasRef,
    isDrawingBoardOpen,
    setIsDrawingBoardOpen,
    drawingHistory,
    redoDrawingHistory,
    drawingTool,
    setDrawingTool,
    brushSize,
    setBrushSize,
    brushColor,
    setBrushColor,
    brushOpacity,
    setBrushOpacity,
    isDrawingToolbarCollapsed,
    setIsDrawingToolbarCollapsed,
    resetDrawingBoard,
    persistCurrentDrawing,
    handleDrawingPointerDown,
    handleDrawingPointerMove,
    endDrawingStroke,
    undoDrawing,
    redoDrawing,
    clearDrawing,
  };
}
