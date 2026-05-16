import { useEffect, useState } from 'react';
import type { Board } from '../types';
import {
  deleteBoardData,
  deleteDrawnImages,
  getBoards,
  getDrawnImagesMap,
  getPracticeAssetImageUrls,
  migrateLocalStorageToIndexedDb,
  saveBoard,
  saveDrawnImages,
} from '../utils/SketchrefDb';
import { shouldSkipPersistentStorage } from '../utils/storageRecovery';

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [drawnImagesMap, setDrawnImagesMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (shouldSkipPersistentStorage) return;

    const loadPersistentData = async () => {
      await migrateLocalStorageToIndexedDb();
      const [nextBoards, nextDrawnImagesMap] = await Promise.all([
        getBoards(),
        getDrawnImagesMap(),
      ]);
      setBoards(nextBoards);
      setDrawnImagesMap(nextDrawnImagesMap);
    };

    loadPersistentData().catch(error => {
      console.warn('Failed to load Sketchref IndexedDB data', error);
    });
  }, []);

  const addBoard = (board: Board) => {
    setBoards(prev => {
      const exists = prev.find(b => b.id === board.id);
      if (exists) return prev.map(b => b.id === board.id ? board : b);
      return [board, ...prev];
    });
    if (!shouldSkipPersistentStorage) {
      void saveBoard(board);
    }
  };

  const removeBoard = (id: string) => {
    setBoards(prev => prev.filter(b => b.id !== id));
    setDrawnImagesMap(prev => {
      const nextMap = { ...prev };
      delete nextMap[id];
      return nextMap;
    });
    if (!shouldSkipPersistentStorage) {
      void deleteBoardData(id);
    }
  };

  const markImageDrawn = (boardId: string, imageUrl: string) => {
    setDrawnImagesMap(prev => {
      const current = prev[boardId] || [];
      if (current.includes(imageUrl)) return prev;
      const nextImages = [...current, imageUrl];
      if (!shouldSkipPersistentStorage) {
        void saveDrawnImages(boardId, nextImages);
      }
      return { ...prev, [boardId]: nextImages };
    });
  };

  const toggleImageDrawn = (boardId: string, imageUrl: string) => {
    setDrawnImagesMap(prev => {
      const current = prev[boardId] || [];
      if (current.includes(imageUrl)) {
        const nextImages = current.filter(img => img !== imageUrl);
        if (!shouldSkipPersistentStorage) {
          if (nextImages.length > 0) void saveDrawnImages(boardId, nextImages);
          else void deleteDrawnImages(boardId);
        }
        if (nextImages.length > 0) return { ...prev, [boardId]: nextImages };
        const nextMap = { ...prev };
        delete nextMap[boardId];
        return nextMap;
      }
      const nextImages = [...current, imageUrl];
      if (!shouldSkipPersistentStorage) {
        void saveDrawnImages(boardId, nextImages);
      }
      return { ...prev, [boardId]: nextImages };
    });
  };

  const clearDrawn = (boardId: string) => {
    setDrawnImagesMap(prev => {
      const nextMap = { ...prev };
      delete nextMap[boardId];
      return nextMap;
    });
    if (!shouldSkipPersistentStorage) {
      void deleteDrawnImages(boardId);
    }
  };

  const resetDrawnFromPracticeAssets = async (board: Board) => {
    if (shouldSkipPersistentStorage) return;

    const assetImageUrls = await getPracticeAssetImageUrls(board.id);
    const assetImageUrlSet = new Set(assetImageUrls);
    const nextImages = board.images.filter(image => assetImageUrlSet.has(image));

    setDrawnImagesMap(prev => {
      if (nextImages.length === 0) {
        const nextMap = { ...prev };
        delete nextMap[board.id];
        return nextMap;
      }
      return { ...prev, [board.id]: nextImages };
    });

    if (nextImages.length > 0) {
      void saveDrawnImages(board.id, nextImages);
    } else {
      void deleteDrawnImages(board.id);
    }
  };

  return {
    boards,
    drawnImagesMap,
    addBoard,
    removeBoard,
    markImageDrawn,
    toggleImageDrawn,
    clearDrawn,
    resetDrawnFromPracticeAssets,
  };
}
