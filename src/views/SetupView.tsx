import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft as ArrowLeftIcon, ArrowRight, Images, Loader2, Play, Shuffle, SkipBack, SkipForward, Upload, X } from 'lucide-react';
import AppButton from '../components/AppButton';
import SegmentedControl from '../components/SegmentedControl';
import { TEXT } from '../i18n';
import type { Board, Locale, OrderMode } from '../types';
import { fileToDataUrl } from '../utils/files';
import { getDrawingImage, getUploadedOverlay, saveUploadedOverlay } from '../utils/SketchrefDb';

export default function SetupView({ 
  board, duration, setDuration, orderMode, setOrderMode, practiceCount, setPracticeCount, skipPracticedImages, setSkipPracticedImages, drawnImages, onResetDrawn, onClearDrawn, onToggleDrawn, onStart, onUpdateBoard, onRemoveBoard, locale 
}: { 
  board: Board; duration: number; setDuration: (d: number) => void; orderMode: OrderMode; setOrderMode: (m: OrderMode) => void; practiceCount: number; setPracticeCount: (c: number) => void; skipPracticedImages: boolean; setSkipPracticedImages: (v: boolean) => void; drawnImages: string[]; onResetDrawn: () => void; onClearDrawn: () => void; onToggleDrawn: (url: string) => void; onStart: () => void; onUpdateBoard: (b: Board) => void; onRemoveBoard: (id: string) => void; locale: Locale;
}) {
  const t = TEXT[locale];
  const isCustomBoard = board.id.startsWith('custom-');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [editBoardName, setEditBoardName] = useState(board.name);
  const [editBoardImages, setEditBoardImages] = useState<string[]>(board.images);
  const [isReadingEditFiles, setIsReadingEditFiles] = useState(false);
  const [draggingImageIndex, setDraggingImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const [visiblePreviewCount, setVisiblePreviewCount] = useState(160);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerDrawingOverlay, setViewerDrawingOverlay] = useState<string | null>(null);
  const [viewerUploadedOverlay, setViewerUploadedOverlay] = useState<string | null>(null);
  const [isDrawingOverlayVisible, setIsDrawingOverlayVisible] = useState(false);
  const [isUploadedOverlayVisible, setIsUploadedOverlayVisible] = useState(false);
  const [isReadingViewerOverlay, setIsReadingViewerOverlay] = useState(false);
  const [viewerOverlayScale, setViewerOverlayScale] = useState(1);
  const [viewerOverlayOffset, setViewerOverlayOffset] = useState({ x: 0, y: 0 });
  const [isDraggingViewerOverlay, setIsDraggingViewerOverlay] = useState(false);
  const viewerOverlayDragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const viewerOverlayInputRef = useRef<HTMLInputElement>(null);
  const isAllDrawn = board.images.length > 0 && board.images.length === drawnImages.length;
  const practicedPercent = board.images.length > 0 ? Math.round((drawnImages.length / board.images.length) * 100) : 0;
  const visibleBoardImages = board.images.slice(0, visiblePreviewCount);
  const viewerImage = viewerIndex === null ? null : board.images[viewerIndex] || null;
  const isViewerImageDrawn = Boolean(viewerImage && drawnImages.includes(viewerImage));

  useEffect(() => {
    setEditBoardName(board.name);
    setEditBoardImages(board.images);
    setDraggingImageIndex(null);
    setDragOverImageIndex(null);
    setVisiblePreviewCount(160);
  }, [board.id, board.name, board.images]);

  useEffect(() => {
    if (!viewerImage) return;

    let isCancelled = false;

    const loadViewerAssets = async () => {
      const [drawingOverlay, uploadedOverlay] = await Promise.all([
        getDrawingImage(board.id, viewerImage),
        getUploadedOverlay(board.id, viewerImage),
      ]);

      if (isCancelled) return;
      setViewerDrawingOverlay(drawingOverlay?.dataUrl || null);
      setViewerUploadedOverlay(uploadedOverlay?.dataUrl || null);
      setIsDrawingOverlayVisible(false);
      setIsUploadedOverlayVisible(Boolean(uploadedOverlay));
      setViewerOverlayScale(1);
      setViewerOverlayOffset({ x: 0, y: 0 });
      setIsDraggingViewerOverlay(false);
    };

    loadViewerAssets().catch(error => {
      console.warn('Failed to load image viewer overlays', error);
    });

    return () => {
      isCancelled = true;
    };
  }, [board.id, viewerImage]);

  useEffect(() => {
    if (!isDraggingViewerOverlay) return;

    const handleMove = (e: MouseEvent) => {
      if (!viewerOverlayDragStartRef.current) return;
      const dx = e.clientX - viewerOverlayDragStartRef.current.x;
      const dy = e.clientY - viewerOverlayDragStartRef.current.y;
      setViewerOverlayOffset({
        x: viewerOverlayDragStartRef.current.startX + dx,
        y: viewerOverlayDragStartRef.current.startY + dy,
      });
    };

    const handleUp = () => {
      setIsDraggingViewerOverlay(false);
      viewerOverlayDragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingViewerOverlay]);

  const timeOptions = [15, 30, 45, 60, 120, 300];
  const practiceCountOptions = [5, 10, 15, 20, 25, 30];

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setIsRemoveConfirmOpen(false);
    setEditBoardName(board.name);
    setEditBoardImages(board.images);
    setDraggingImageIndex(null);
    setDragOverImageIndex(null);
    setIsReadingEditFiles(false);
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  const handleEditFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsReadingEditFiles(true);
    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setEditBoardImages(prev => [...prev, ...dataUrls.filter(Boolean)]);
    } catch (error) {
      alert(error instanceof Error ? error.message : t.unknownError);
    } finally {
      setIsReadingEditFiles(false);
      e.target.value = '';
    }
  };

  const removeEditImage = (index: number) => {
    setEditBoardImages(prev => prev.filter((_, i) => i !== index));
  };

  const reorderEditImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setEditBoardImages(prev => {
      const next = [...prev];
      const [dragged] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, dragged);
      return next;
    });
  };

  const handleImageDragEnter = (targetIndex: number) => {
    if (draggingImageIndex === null || draggingImageIndex === targetIndex) return;
    reorderEditImages(draggingImageIndex, targetIndex);
    setDraggingImageIndex(targetIndex);
    setDragOverImageIndex(targetIndex);
  };

  const handleSaveEditBoard = (e: React.FormEvent) => {
    e.preventDefault();
    const name = editBoardName.trim();
    if (!name || editBoardImages.length === 0) return;
    onUpdateBoard({
      id: board.id,
      name,
      images: editBoardImages,
    });
    setIsEditModalOpen(false);
  };

  const handleRemoveBoard = () => {
    setIsRemoveConfirmOpen(true);
  };

  const confirmRemoveBoard = () => {
    onRemoveBoard(board.id);
  };

  const handleStartAction = () => {
    if (skipPracticedImages && isAllDrawn) {
      onClearDrawn();
    }
    onStart();
  };

  const openImageViewer = (index: number) => {
    setViewerIndex(index);
  };

  const closeImageViewer = () => {
    setViewerIndex(null);
    setViewerDrawingOverlay(null);
    setViewerUploadedOverlay(null);
    setIsDrawingOverlayVisible(false);
    setIsUploadedOverlayVisible(false);
    setViewerOverlayScale(1);
    setViewerOverlayOffset({ x: 0, y: 0 });
    setIsDraggingViewerOverlay(false);
    setIsReadingViewerOverlay(false);
  };

  const goViewerPrev = () => {
    setViewerIndex(prev => {
      if (prev === null || board.images.length === 0) return prev;
      return prev === 0 ? board.images.length - 1 : prev - 1;
    });
  };

  const goViewerNext = () => {
    setViewerIndex(prev => {
      if (prev === null || board.images.length === 0) return prev;
      return (prev + 1) % board.images.length;
    });
  };

  const handleViewerOverlayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewerImage) return;

    setIsReadingViewerOverlay(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await saveUploadedOverlay(board.id, viewerImage, dataUrl);
      setViewerUploadedOverlay(dataUrl);
      setIsDrawingOverlayVisible(false);
      setIsUploadedOverlayVisible(true);
      setViewerOverlayScale(1);
      setViewerOverlayOffset({ x: 0, y: 0 });
      if (!drawnImages.includes(viewerImage)) {
        onToggleDrawn(viewerImage);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : t.unknownError);
    } finally {
      setIsReadingViewerOverlay(false);
      e.target.value = '';
    }
  };

  const toggleViewerDrawn = () => {
    if (!viewerImage) return;
    onToggleDrawn(viewerImage);
  };

  const toggleDrawingOverlay = () => {
    if (!viewerDrawingOverlay) return;
    setIsDrawingOverlayVisible(prev => {
      const next = !prev;
      if (next) {
        setIsUploadedOverlayVisible(false);
        setViewerOverlayScale(1);
        setViewerOverlayOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleViewerOverlayMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    setIsDraggingViewerOverlay(true);
    viewerOverlayDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: viewerOverlayOffset.x,
      startY: viewerOverlayOffset.y,
    };
  };

  const handleViewerOverlayWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    e.preventDefault();
    setViewerOverlayScale(prev => {
      const next = prev + (e.deltaY < 0 ? 0.1 : -0.1);
      return Math.min(5, Math.max(0.2, next));
    });
  };

  return (
    <main className="app-main relative">
      <div className="flex flex-col gap-10 w-full">
        <section className="grid lg:grid-cols-[1fr_18rem] gap-8 lg:gap-12 items-end">
          <div className="min-w-0">
            <h1 className="ui-heading-page">{board.name}</h1>
            <div className="mt-5 grid grid-cols-3 max-w-md divide-x divide-neutral-200 dark:divide-neutral-800 text-sm">
              <div className="pr-4">
                <p className="text-neutral-400">{t.imagesLabel}</p>
                <p className="mt-1 font-medium">{board.images.length}</p>
              </div>
              <div className="px-4">
                <p className="text-neutral-400">{t.practicedCount}</p>
                <p className="mt-1 font-medium">{drawnImages.length}</p>
              </div>
              <div className="pl-4">
                <p className="text-neutral-400">{t.progress}</p>
                <p className="mt-1 font-medium">{practicedPercent}%</p>
              </div>
            </div>
          </div>

          <div className="flex lg:justify-end">
            <AppButton
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              variant="pill"
              width="auto"
            >
              {t.startPractice}
            </AppButton>
          </div>
        </section>

        <section className="w-full flex flex-col">
          <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.previewHint}</p>
            <div className="flex items-center gap-4">
              {isCustomBoard && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="ui-btn-text"
                >
                  {t.editBoard}
                </button>
              )}
              <button
                onClick={onResetDrawn}
                title={t.resetPracticeHistory}
                disabled={board.images.length === 0}
                className="ui-btn-text disabled:opacity-40"
              >
                {t.resetShort}
              </button>
            </div>
          </div>
          <div className="ui-thumb-grid">
            {visibleBoardImages.map((img, i) => {
              const isDrawn = drawnImages.includes(img);
              return (
                <div key={i} onClick={() => openImageViewer(i)} className="ui-image-thumb group">
                  <img
                    src={img}
                    loading="lazy"
                    decoding="async"
                    className={isDrawn ? 'opacity-30 grayscale' : 'opacity-100 group-hover:opacity-80'}
                  />
                </div>
              );
            })}
          </div>
          {visiblePreviewCount < board.images.length && (
            <button
              type="button"
              onClick={() => setVisiblePreviewCount(prev => prev + 160)}
              className="ui-btn-text mt-6 self-center"
            >
              {t.showMore}
            </button>
          )}
        </section>
      </div>

      {isSettingsModalOpen && (
        <div className="ui-modal-overlay">
          <button
            type="button"
            className="ui-modal-backdrop"
            onClick={closeSettingsModal}
            aria-label={t.cancel}
          />
          <div className="ui-modal-panel ui-modal-panel-lg">
            <div className="w-full flex flex-col gap-6">
              <div className="text-center">
                <h2 className="text-lg font-medium">{t.settingsTitle}</h2>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t.boardReady}</p>
              </div>

              <div className="ui-settings-group">
                <p className="ui-field-label">{t.settingsDuration}</p>
                <SegmentedControl
                  className="bg-transparent"
                  optionClassName="text-sm"
                  options={timeOptions.map(option => ({
                    value: option,
                    label: option >= 60 ? `${option / 60}${TEXT[locale].minutesShort}` : `${option}${TEXT[locale].secondsShort}`,
                  }))}
                  value={duration}
                  onChange={setDuration}
                />
              </div>

              <div className="ui-settings-group">
                <p className="ui-field-label">{t.settingsCount}</p>
                <SegmentedControl
                  optionClassName="px-2 font-medium"
                  options={practiceCountOptions.map(option => ({
                    value: option,
                    label: locale === 'zh-TW' ? `${option}張` : option,
                  }))}
                  value={practiceCount}
                  onChange={setPracticeCount}
                />
              </div>

              <div className="ui-settings-group">
                <p className="ui-field-label">{t.settingsOrder}</p>
                <SegmentedControl
                  options={[
                    {
                      value: 'SEQUENTIAL',
                      label: (
                        <>
                          <ArrowRight size={16} /> <span className="hidden sm:inline">{t.sequential}</span>
                        </>
                      ),
                    },
                    {
                      value: 'REVERSE',
                      label: (
                        <>
                          <ArrowLeftIcon size={16} /> <span className="hidden sm:inline">{t.reverse}</span>
                        </>
                      ),
                    },
                    {
                      value: 'RANDOM',
                      label: (
                        <>
                          <Shuffle size={16} /> <span className="hidden sm:inline">{t.random}</span>
                        </>
                      ),
                    },
                  ]}
                  value={orderMode}
                  onChange={setOrderMode}
                />
              </div>

              <button
                type="button"
                onClick={() => setSkipPracticedImages(!skipPracticedImages)}
                className="ui-switch-row"
                aria-pressed={skipPracticedImages}
                title={t.skipPracticedImages}
              >
                <span className="text-neutral-600 dark:text-neutral-300">{t.skipPracticedImages}</span>
                <span
                  className={`ui-switch-track ${
                    skipPracticedImages
                      ? 'ui-switch-track-on'
                      : 'ui-switch-track-off'
                  }`}
                >
                  <span
                    className={`ui-switch-knob ${
                      skipPracticedImages ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>

              <div className="flex items-center justify-center gap-4">
                <AppButton 
                  onClick={handleStartAction}
                  disabled={board.images.length === 0 || (isAllDrawn && !skipPracticedImages)}
                  variant="pill"
                  width="auto"
                  className="flex items-center justify-center"
                >
                  {skipPracticedImages && isAllDrawn ? t.restart : isAllDrawn ? t.completed : t.start}
                  <Play size={18} className="ml-2" fill="currentColor" />
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewerImage && (
        <div className="image-viewer-overlay">
          <button
            type="button"
            className="image-viewer-backdrop"
            onClick={closeImageViewer}
            aria-label={t.cancel}
          />
          <div className="image-viewer-panel">
            <button
              type="button"
              onClick={closeImageViewer}
              className="image-viewer-close"
              aria-label={t.cancel}
              title={t.cancel}
            >
              <X size={20} />
            </button>
            <div className="image-viewer-stage">
              <img
                src={viewerImage}
                alt={t.referenceAlt}
                className="image-viewer-reference"
              />
              {viewerDrawingOverlay && isDrawingOverlayVisible && (
                <img
                  src={viewerDrawingOverlay}
                  alt={t.practiceOverlayAlt}
                  className={`image-viewer-layer image-viewer-layer-interactive ${
                    isDraggingViewerOverlay ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{
                    transform: `translate(${viewerOverlayOffset.x}px, ${viewerOverlayOffset.y}px) scale(${viewerOverlayScale})`,
                    transformOrigin: 'center center',
                  }}
                  onMouseDown={handleViewerOverlayMouseDown}
                  onWheel={handleViewerOverlayWheel}
                  draggable={false}
                />
              )}
              {viewerUploadedOverlay && isUploadedOverlayVisible && (
                <img
                  src={viewerUploadedOverlay}
                  alt={t.uploadedOverlayAlt}
                  className={`image-viewer-layer image-viewer-layer-interactive ${
                    isDraggingViewerOverlay ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{
                    transform: `translate(${viewerOverlayOffset.x}px, ${viewerOverlayOffset.y}px) scale(${viewerOverlayScale})`,
                    transformOrigin: 'center center',
                  }}
                  onMouseDown={handleViewerOverlayMouseDown}
                  onWheel={handleViewerOverlayWheel}
                  draggable={false}
                />
              )}
            </div>
            <div className="image-viewer-controls">
              <input
                ref={viewerOverlayInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleViewerOverlayUpload}
              />
              <button
                type="button"
                onClick={goViewerPrev}
                className="drawing-control-btn"
                title={t.previousImage}
                aria-label={t.previousImage}
              >
                <SkipBack size={20} />
                <span className="hidden sm:inline">{t.previousImage}</span>
              </button>
              <button
                type="button"
                onClick={goViewerNext}
                className="drawing-control-btn"
                title={t.nextImage}
                aria-label={t.nextImage}
              >
                <SkipForward size={20} />
                <span className="hidden sm:inline">{t.nextImage}</span>
              </button>
              <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-2" />
              <button
                type="button"
                onClick={toggleDrawingOverlay}
                disabled={!viewerDrawingOverlay}
                className={`drawing-control-btn ${isDrawingOverlayVisible ? 'drawing-control-btn-active' : ''}`}
                title={viewerDrawingOverlay ? t.toggleOverlay : t.noDrawingOverlay}
                aria-label={viewerDrawingOverlay ? t.toggleOverlay : t.noDrawingOverlay}
                aria-pressed={isDrawingOverlayVisible}
              >
                <Images size={20} />
                <span className="hidden sm:inline">{t.toggleOverlay}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDrawingOverlayVisible(false);
                  setViewerOverlayScale(1);
                  setViewerOverlayOffset({ x: 0, y: 0 });
                  viewerOverlayInputRef.current?.click();
                }}
                disabled={isReadingViewerOverlay}
                className={`drawing-control-btn ${isUploadedOverlayVisible ? 'drawing-control-btn-active' : ''}`}
                title={t.uploadOverlay}
                aria-label={t.uploadOverlay}
                aria-pressed={isUploadedOverlayVisible}
              >
                {isReadingViewerOverlay ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                <span className="hidden sm:inline">{t.uploadOverlay}</span>
              </button>
              <button
                type="button"
                onClick={toggleViewerDrawn}
                className={`drawing-control-btn ${isViewerImageDrawn ? 'drawing-control-btn-active' : ''}`}
                title={isViewerImageDrawn ? t.unmarkPracticed : t.markPracticed}
                aria-label={isViewerImageDrawn ? t.unmarkPracticed : t.markPracticed}
                aria-pressed={isViewerImageDrawn}
              >
                <span className="hidden sm:inline">{isViewerImageDrawn ? t.unmarkPracticed : t.markPracticed}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isCustomBoard && isEditModalOpen && (
        <div className="ui-modal-overlay">
          <button
            type="button"
            className="ui-modal-backdrop"
            onClick={closeEditModal}
            aria-label={t.cancel}
          />
          <div className="ui-modal-panel ui-modal-panel-lg">
            <form onSubmit={handleSaveEditBoard} className="ui-modal-form">
              <div className="ui-modal-title">
                <h2 className="text-lg font-medium">{t.editBoard}</h2>
              </div>
              <label className="w-full">
                <input
                  type="text"
                  value={editBoardName}
                  onChange={e => setEditBoardName(e.target.value)}
                  placeholder={t.boardNamePlaceholder}
                  className="ui-input-underline"
                />
              </label>

              <label className="ui-upload-btn">
                <Upload size={16} />
                {isReadingEditFiles ? <Loader2 size={18} className="animate-spin inline" /> : t.selectImages}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleEditFileSelect}
                  className="hidden"
                />
              </label>

              <p className="text-xs text-neutral-500">
                {editBoardImages.length}{t.selectedImages}
              </p>

              <div className="ui-modal-image-grid">
                {editBoardImages.map((img, idx) => (
                  <div
                    key={`${idx}-${img.slice(0, 32)}`}
                    className={`ui-modal-image-drag-item ${
                      draggingImageIndex === idx ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                    } ${
                      dragOverImageIndex === idx ? 'ring-1 ring-neutral-400 dark:ring-neutral-600' : ''
                    }`}
                    draggable
                    onDragStart={() => setDraggingImageIndex(idx)}
                    onDragEnter={() => handleImageDragEnter(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      setDraggingImageIndex(null);
                      setDragOverImageIndex(null);
                    }}
                  >
                    <img src={img} alt={`edit-${idx}`} className="ui-modal-image-thumb" loading="lazy" decoding="async" />
                    <button
                      type="button"
                      onClick={() => removeEditImage(idx)}
                      title={t.removeImage}
                      className="ui-thumb-remove-btn"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="ui-modal-actions">
                <AppButton
                  type="button"
                  variant="text"
                  onClick={handleRemoveBoard}
                  className="ui-btn-danger-text mr-auto"
                >
                  {t.removeBoard}
                </AppButton>
                <AppButton
                  type="button"
                  variant="cancel"
                  onClick={closeEditModal}
                >
                  {t.cancel}
                </AppButton>
                <AppButton
                  type="submit"
                  disabled={!editBoardName.trim() || editBoardImages.length === 0 || isReadingEditFiles}
                  variant="primary"
                >
                  {t.save}
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCustomBoard && isRemoveConfirmOpen && (
        <div className="ui-modal-overlay">
          <button
            type="button"
            className="ui-modal-backdrop"
            onClick={() => setIsRemoveConfirmOpen(false)}
            aria-label={t.cancel}
          />
          <div className="ui-modal-panel ui-modal-panel-md ui-modal-panel-flush-bottom">
            <div className="ui-modal-form">
              <div className="ui-modal-title">
                <h2 className="text-lg font-medium">{t.confirmRemoveBoardTitle}</h2>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {t.confirmRemoveBoardMessage}
                </p>
              </div>
              <div className="ui-modal-actions">
                <AppButton
                  type="button"
                  variant="cancel"
                  onClick={() => setIsRemoveConfirmOpen(false)}
                >
                  {t.cancel}
                </AppButton>
                <AppButton
                  type="button"
                  variant="text"
                  onClick={confirmRemoveBoard}
                  className="ui-btn-danger-text"
                >
                  {t.removeBoard}
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
