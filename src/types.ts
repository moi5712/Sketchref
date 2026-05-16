export interface Board {
  id: string;
  name: string;
  images: string[];
}

export interface StoredImageAsset {
  id: string;
  boardId: string;
  imageKey: string;
  imageUrl: string;
  dataUrl: string;
  updatedAt: number;
}

export type OrderMode = 'SEQUENTIAL' | 'REVERSE' | 'RANDOM';
export type Locale = 'en' | 'zh-TW';
