import { useEffect } from 'react';
import { Brush, ChevronDown, ChevronUp, Eraser, Pause, Play, Redo2, SkipBack, SkipForward, Trash2, Undo2, X } from 'lucide-react';
import { useDrawingCanvas } from '../hooks/useDrawingCanvas';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { TEXT } from '../i18n';
import type { Board, Locale, OrderMode } from '../types';

interface DrawingViewProps {
  board: Board;
  duration: number;
  orderMode: OrderMode;
  practiceCount: number;
  skipPracticedImages: boolean;
  drawnImages: string[];
  onMarkDrawn: (url: string) => void;
  onStop: () => void;
  locale: Locale;
}

export default function DrawingView({
  board,
  duration,
  orderMode,
  practiceCount,
  skipPracticedImages,
  drawnImages,
  onMarkDrawn,
  onStop,
  locale,
}: DrawingViewProps) {
  const t = TEXT[locale];
  const {
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
  } = usePracticeSession({
    board,
    duration,
    orderMode,
    practiceCount,
    skipPracticedImages,
    drawnImages,
    onMarkDrawn,
  });
  const {
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
  } = useDrawingCanvas({
    boardId: board.id,
    images,
    onMarkDrawn,
    onPersistedImage: completeImage,
  });

  const resetPracticeLayers = () => {
    resetDrawingBoard();
  };

  const goNext = () => {
    persistCurrentDrawing(currentIndex);
    handleLeaveImage(currentIndex);
    if (hasReachedTarget()) {
      onStop();
    } else {
      setCurrentIndex(prev => (images.length === 0 ? 0 : (prev + 1) % images.length));
      resetPracticeLayers();
      resetTimer();
    }
  };

  const goPrev = () => {
    persistCurrentDrawing(currentIndex);
    handleLeaveImage(currentIndex);
    if (hasReachedTarget()) {
      onStop();
    } else {
      setCurrentIndex(prev => (images.length === 0 ? 0 : prev === 0 ? images.length - 1 : prev - 1));
      resetPracticeLayers();
      resetTimer();
    }
  };

  const handleStopPractice = () => {
    persistCurrentDrawing(currentIndex);
    handleLeaveImage(currentIndex);
    onStop();
  };

  const toggleDrawingBoard = () => {
    if (isDrawingBoardOpen) {
      persistCurrentDrawing(currentIndex);
    }
    setIsDrawingBoardOpen(prev => !prev);
  };

  useEffect(() => {
    if (timeLeft <= 0) {
      goNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const progressPercent = ((duration - timeLeft) / duration) * 100;
  const sessionProgressLabel = `${completedPracticeCount}/${targetPracticeCount}`;

  return (
    <div className="drawing-screen fixed inset-0 flex flex-col select-none cursor-auto">
      <div className="drawing-progress-track absolute top-0 left-0 w-full h-1 z-50">
        <div
          className="drawing-progress-bar h-full transition-[width] ease-linear duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className={`drawing-stage ${isDrawingBoardOpen ? 'drawing-stage-split' : ''}`}>
        {isDrawingBoardOpen && (
          <section className="drawing-board-panel">
            <div className={`drawing-board-toolbar ${isDrawingToolbarCollapsed ? 'drawing-board-toolbar-collapsed' : ''}`}>
              <button
                type="button"
                onClick={() => setIsDrawingToolbarCollapsed(prev => !prev)}
                className="drawing-tool-btn"
                title={isDrawingToolbarCollapsed ? t.expandToolbar : t.collapseToolbar}
                aria-label={isDrawingToolbarCollapsed ? t.expandToolbar : t.collapseToolbar}
                aria-expanded={!isDrawingToolbarCollapsed}
              >
                {isDrawingToolbarCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
              <button
                type="button"
                onClick={undoDrawing}
                disabled={drawingHistory.length === 0}
                className="drawing-tool-btn"
                title={`${t.undoDrawing} (Ctrl+Z)`}
                aria-label={t.undoDrawing}
              >
                <Undo2 size={16} />
              </button>
              <button
                type="button"
                onClick={redoDrawing}
                disabled={redoDrawingHistory.length === 0}
                className="drawing-tool-btn"
                title={`${t.redoDrawing} (Ctrl+Shift+Z / Ctrl+Y)`}
                aria-label={t.redoDrawing}
              >
                <Redo2 size={16} />
              </button>
              <div className="drawing-toolbar-divider" />
              <button
                type="button"
                onClick={() => setDrawingTool('brush')}
                className={`drawing-tool-btn ${drawingTool === 'brush' ? 'drawing-tool-btn-active' : ''}`}
                title={t.brushTool}
                aria-label={t.brushTool}
                aria-pressed={drawingTool === 'brush'}
              >
                <Brush size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDrawingTool('eraser')}
                className={`drawing-tool-btn ${drawingTool === 'eraser' ? 'drawing-tool-btn-active' : ''}`}
                title={t.eraserTool}
                aria-label={t.eraserTool}
                aria-pressed={drawingTool === 'eraser'}
              >
                <Eraser size={16} />
              </button>
              <div className="drawing-toolbar-divider" />
              <label className="drawing-tool-field">
                <span>{t.brushSize}</span>
                <input
                  type="range"
                  min="1"
                  max="48"
                  value={brushSize}
                  onChange={e => setBrushSize(Number(e.target.value))}
                />
                <strong>{brushSize}</strong>
              </label>
              <label className="drawing-tool-field">
                <span>{t.brushOpacity}</span>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={brushOpacity}
                  onChange={e => setBrushOpacity(Number(e.target.value))}
                />
                <strong>{Math.round(brushOpacity * 100)}%</strong>
              </label>
              <label className="drawing-tool-field drawing-tool-field-compact">
                <span>{t.brushColor}</span>
                <input
                  type="color"
                  value={brushColor}
                  onChange={e => setBrushColor(e.target.value)}
                />
              </label>
              <div className="drawing-toolbar-divider" />
              <button
                type="button"
                onClick={clearDrawing}
                className="drawing-tool-btn drawing-tool-btn-danger"
                title={t.clearDrawing}
                aria-label={t.clearDrawing}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <canvas
              ref={drawingCanvasRef}
              className="drawing-board-canvas"
              onPointerDown={handleDrawingPointerDown}
              onPointerMove={handleDrawingPointerMove}
              onPointerUp={endDrawingStroke}
              onPointerCancel={endDrawingStroke}
              onPointerLeave={endDrawingStroke}
            />
          </section>
        )}
        <section className="drawing-reference-panel">
          {images.length > 0 && (
            <img
              src={images[currentIndex]}
              alt={t.referenceAlt}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          )}
        </section>
      </div>

      <div className="drawing-controls">
        <button onClick={goPrev} className="drawing-control-btn" title={t.previousImage} aria-label={t.previousImage}>
          <SkipBack size={20} />
          <span className="hidden sm:inline">{t.previousImage}</span>
        </button>

        <button onClick={() => setIsPlaying(!isPlaying)} className="drawing-control-btn-main" title={isPlaying ? t.pause : t.start} aria-label={isPlaying ? t.pause : t.start}>
          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>

        <button onClick={goNext} className="drawing-control-btn" title={t.nextImage} aria-label={t.nextImage}>
          <SkipForward size={20} />
          <span className="hidden sm:inline">{t.nextImage}</span>
        </button>

        <div className="ui-divider w-px h-6 mx-2" />

        <button
          onClick={toggleDrawingBoard}
          className={`drawing-control-btn relative ${isDrawingBoardOpen ? 'drawing-control-btn-active' : ''}`}
          title={t.openDrawingBoard}
          aria-label={t.openDrawingBoard}
          aria-pressed={isDrawingBoardOpen}
        >
          <Brush size={20} />
          <span className="hidden sm:inline">{t.openDrawingBoard}</span>
        </button>

        <button onClick={handleStopPractice} className="drawing-control-btn drawing-control-btn-danger" title={t.stopPractice} aria-label={t.stopPractice}>
          <X size={20} />
          <span className="hidden sm:inline">{t.stopPractice}</span>
        </button>
      </div>

      <div className="drawing-timer">
        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        <span className="drawing-timer-progress ml-3 text-sm">{sessionProgressLabel}</span>
      </div>
    </div>
  );
}
