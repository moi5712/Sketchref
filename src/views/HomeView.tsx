import React, { useState } from 'react';
import { ImagePlus, Link, Loader2, Trash2, Upload, X } from 'lucide-react';
import AppButton from '../components/AppButton';
import { TEXT } from '../i18n';
import type { Board, Locale } from '../types';
import { fileToDataUrl } from '../utils/files';

export default function HomeView({
  boards,
  drawnImagesMap,
  onAddBoard,
  onSelectBoard,
  onRemoveBoard,
  locale,
}: {
  boards: Board[];
  drawnImagesMap: Record<string, string[]>;
  onAddBoard: (b: Board) => void;
  onSelectBoard: (b: Board) => void;
  onRemoveBoard: (id: string, e?: React.MouseEvent) => void;
  locale: Locale;
}) {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [boardPendingRemoval, setBoardPendingRemoval] = useState<Board | null>(null);
  const [customName, setCustomName] = useState('');
  const [customImages, setCustomImages] = useState<string[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [draggingCustomImageIndex, setDraggingCustomImageIndex] = useState<number | null>(null);
  const [dragOverCustomImageIndex, setDragOverCustomImageIndex] = useState<number | null>(null);
  const t = TEXT[locale];

  const resetHomeCreationState = () => {
    setCustomName('');
    setCustomImages([]);
    setIsReadingFiles(false);
    setDraggingCustomImageIndex(null);
    setDragOverCustomImageIndex(null);
  };

  const closeCustomModal = () => {
    resetHomeCreationState();
    setIsCustomModalOpen(false);
  };

  const handleCustomFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsReadingFiles(true);
    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setCustomImages(prev => [...prev, ...dataUrls.filter(Boolean)]);
    } catch (error) {
      alert(error instanceof Error ? error.message : t.unknownError);
    } finally {
      setIsReadingFiles(false);
      e.target.value = '';
    }
  };

  const handleCreateCustomBoard = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim();
    if (!name || customImages.length === 0) return;

    onAddBoard({
      id: `custom-${Date.now()}`,
      name,
      images: customImages,
    });
    closeCustomModal();
  };

  const removeCustomImage = (index: number) => {
    setCustomImages(prev => prev.filter((_, i) => i !== index));
  };

  const requestRemoveBoard = (board: Board, e: React.MouseEvent) => {
    e.stopPropagation();
    setBoardPendingRemoval(board);
  };

  const confirmRemoveBoard = () => {
    if (!boardPendingRemoval) return;
    onRemoveBoard(boardPendingRemoval.id);
    setBoardPendingRemoval(null);
  };

  const reorderCustomImages = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setCustomImages(prev => {
      const next = [...prev];
      const [dragged] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, dragged);
      return next;
    });
  };

  const handleCustomImageDragEnter = (targetIndex: number) => {
    if (draggingCustomImageIndex === null || draggingCustomImageIndex === targetIndex) return;
    reorderCustomImages(draggingCustomImageIndex, targetIndex);
    setDraggingCustomImageIndex(targetIndex);
    setDragOverCustomImageIndex(targetIndex);
  };

  return (
    <main className="app-main">
      <section className="home-hero">
        <div className="home-intro">
          <div>
            <h1 className="ui-heading-hero">{t.appName}</h1>
            <p className="ui-body-muted mt-4 max-w-xl text-base sm:text-lg leading-7">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        <div className="ui-source-panel">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(true)}
              className="ui-source-option"
            >
              <span className="ui-source-option-icon">
                <ImagePlus size={18} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-medium">{t.createNewBoard}</span>
                <span className="ui-source-option-meta">{t.customDescription}</span>
              </span>
            </button>
            <button
              type="button"
              className="ui-source-option"
            >
              <span className="ui-source-option-icon">
                <Link size={18} />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-sm font-medium">{t.importFromPinterest}</span>
                <span className="ui-source-option-meta">{t.comingSoon}</span>
              </span>
            </button>
          </div>
        </div>
      </section>

      {isCustomModalOpen && (
        <div className="ui-modal-overlay">
          <button
            type="button"
            onClick={closeCustomModal}
            className="ui-modal-backdrop"
            aria-label={t.cancel}
          />
          <div className="ui-modal-panel ui-modal-panel-md">
            <form onSubmit={handleCreateCustomBoard} className="ui-modal-form">
              <div className="ui-modal-title">
                <h2 className="text-lg font-medium">{t.customTitle}</h2>
              </div>
              <label className="w-full">
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder={t.boardNamePlaceholder}
                  className="ui-input-underline"
                />
              </label>
              <label className="ui-upload-btn">
                <Upload size={16} />
                {isReadingFiles ? <Loader2 size={18} className="animate-spin inline" /> : t.selectImages}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCustomFileSelect}
                  className="hidden"
                />
              </label>
              {customImages.length > 0 && (
                <div className="w-full flex flex-col gap-2">
                  <p className="w-full text-left text-xs text-neutral-500">
                    {customImages.length}{t.selectedImages}
                  </p>
                  <div className="ui-modal-image-grid">
                    {customImages.map((img, idx) => (
                      <div
                        key={`${idx}-${img.slice(0, 32)}`}
                        className={`ui-modal-image-drag-item ${
                          draggingCustomImageIndex === idx ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                        } ${
                          dragOverCustomImageIndex === idx ? 'ring-1 ring-neutral-400 dark:ring-neutral-600' : ''
                        }`}
                        draggable
                        onDragStart={() => setDraggingCustomImageIndex(idx)}
                        onDragEnter={() => handleCustomImageDragEnter(idx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => e.preventDefault()}
                        onDragEnd={() => {
                          setDraggingCustomImageIndex(null);
                          setDragOverCustomImageIndex(null);
                        }}
                      >
                        <img src={img} alt={`custom-${idx}`} className="ui-modal-image-thumb" loading="lazy" decoding="async" />
                        <button
                          type="button"
                          onClick={() => removeCustomImage(idx)}
                          title={t.removeImage}
                          className="ui-thumb-remove-btn"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="ui-modal-actions">
                <AppButton
                  type="button"
                  variant="cancel"
                  onClick={closeCustomModal}
                >
                  {t.cancel}
                </AppButton>
                <AppButton
                  type="submit"
                  disabled={!customName.trim() || customImages.length === 0 || isReadingFiles}
                  variant="primary"
                >
                  {t.createBoard}
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="w-full">
        {boards.length > 0 && (
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium">{t.yourBoards}</h2>
            <p className="text-xs text-neutral-400">
              {locale === 'zh-TW' ? `${boards.length} 個圖版` : `${boards.length} boards`}
            </p>
          </div>
        )}
        {boards.length > 0 ? (
          <div className="board-grid">
            {boards.map(b => {
              const practiced = drawnImagesMap[b.id]?.length || 0;
              const coverImages = b.images.slice(0, 4);
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBoard(b)}
                  className="group ui-board-card"
                >
                  <button
                    onClick={(e) => requestRemoveBoard(b, e)}
                    className="ui-icon-danger ui-motion"
                    title={t.removeBoard}
                    aria-label={t.removeBoard}
                  >
                    <Trash2 size={16} className="text-neutral-500" />
                  </button>
                  <div className="ui-board-cover">
                    {coverImages.length > 0 ? (
                      coverImages.map((img, idx) => (
                        <img key={`${b.id}-${idx}`} src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ))
                    ) : (
                      <ImagePlus size={28} className="text-neutral-300 dark:text-neutral-700" />
                    )}
                  </div>
                  <div className="ui-board-meta">
                    <p className="font-medium text-sm truncate">{b.name}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {locale === 'zh-TW'
                        ? `${b.images.length} 張圖片 · ${practiced} ${t.practicedCount}`
                        : `${b.images.length} images · ${practiced} ${t.practicedCount}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full">
            <div className="ui-empty-panel">
              <p className="text-base font-medium">{t.emptyTitle}</p>
              <p className="mt-3 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                {t.emptyDescription}
              </p>
            </div>
          </div>
        )}
      </section>

      {boardPendingRemoval && (
        <div className="ui-modal-overlay">
          <button
            type="button"
            className="ui-modal-backdrop"
            onClick={() => setBoardPendingRemoval(null)}
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
                  onClick={() => setBoardPendingRemoval(null)}
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
