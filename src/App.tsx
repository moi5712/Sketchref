import React, { useState } from 'react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import './app.css';
import { useAppSettings } from './hooks/useAppSettings';
import { useBoards } from './hooks/useBoards';
import { TEXT } from './i18n';
import type { Board } from './types';
import HomeView from './views/HomeView';
import SetupView from './views/SetupView';
import DrawingView from './views/DrawingView';

export default function App() {
  const [view, setView] = useState<'HOME' | 'SETUP' | 'DRAWING'>('HOME');
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const {
    duration,
    setDuration,
    orderMode,
    setOrderMode,
    practiceCount,
    setPracticeCount,
    skipPracticedImages,
    setSkipPracticedImages,
    isDarkMode,
    locale,
    toggleLocale,
    toggleTheme,
  } = useAppSettings();
  const {
    boards,
    drawnImagesMap,
    addBoard,
    removeBoard,
    markImageDrawn,
    toggleImageDrawn,
    clearDrawn,
    resetDrawnFromPracticeAssets,
  } = useBoards();
  const t = TEXT[locale];

  const handleAddOrUpdateBoard = (board: Board) => {
    if (currentBoard?.id === board.id) {
      setCurrentBoard(board);
    }
    addBoard(board);
  };

  const handleRemoveBoard = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    removeBoard(id);
  };

  const removeCurrentBoard = (id: string) => {
    handleRemoveBoard(id);
    setCurrentBoard(null);
    setView('HOME');
  };

  return (
    <div className="app-shell">
      {/* Global Header (hidden in Drawing mode) */}
      {view !== 'DRAWING' && (
        <header className="app-header">
          {view === 'SETUP' && currentBoard ? (
            <>
              <button
                onClick={() => { setView('HOME'); setCurrentBoard(null); }}
                className="header-icon-btn mr-4"
                title="Back"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="ml-auto flex items-center">
                <button
                  onClick={toggleLocale}
                  className="header-lang-btn"
                  title={t.toggleLanguage}
                >
                  {t.languageButton}
                </button>
                <button 
                  onClick={toggleTheme}
                  className="header-icon-btn"
                  title={t.toggleTheme}
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
            </>
          ) : (
            <div className="ml-auto flex items-center">
              <button
                onClick={toggleLocale}
                className="header-lang-btn"
                title={t.toggleLanguage}
              >
                {t.languageButton}
              </button>
              <button 
                onClick={toggleTheme}
                className="header-icon-btn"
                title={t.toggleTheme}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          )}
        </header>
      )}

      {view === 'HOME' && (
        <HomeView 
          boards={boards} 
          drawnImagesMap={drawnImagesMap}
          onAddBoard={handleAddOrUpdateBoard}
          onSelectBoard={(b) => { setCurrentBoard(b); setView('SETUP'); }}
          onRemoveBoard={handleRemoveBoard}
          locale={locale}
        />
      )}

      {view === 'SETUP' && currentBoard && (
        <SetupView 
          board={currentBoard} 
          duration={duration} 
          setDuration={setDuration}
          orderMode={orderMode}
          setOrderMode={setOrderMode}
          practiceCount={practiceCount}
          setPracticeCount={setPracticeCount}
          skipPracticedImages={skipPracticedImages}
          setSkipPracticedImages={setSkipPracticedImages}
          drawnImages={drawnImagesMap[currentBoard.id] || []}
          onResetDrawn={() => void resetDrawnFromPracticeAssets(currentBoard)}
          onClearDrawn={() => clearDrawn(currentBoard.id)}
          onToggleDrawn={(url) => toggleImageDrawn(currentBoard.id, url)}
          onStart={() => setView('DRAWING')}
          onUpdateBoard={handleAddOrUpdateBoard}
          onRemoveBoard={removeCurrentBoard}
          locale={locale}
        />
      )}

      {view === 'DRAWING' && currentBoard && (
        <DrawingView 
          board={currentBoard}
          duration={duration}
          orderMode={orderMode}
          practiceCount={practiceCount}
          skipPracticedImages={skipPracticedImages}
          drawnImages={drawnImagesMap[currentBoard.id] || []}
          onMarkDrawn={(url) => markImageDrawn(currentBoard.id, url)}
          onStop={() => setView('SETUP')}
          locale={locale}
        />
      )}
    </div>
  );
}
