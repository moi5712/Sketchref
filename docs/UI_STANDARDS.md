# Sketchref UI 標準規範

本規範採用 **Spacious Line Minimal（大留白線性極簡）** 風格：空間感大、線條俐落、動畫克制且一致。

## 1) 核心風格決策

- **空間感**：版面與卡片優先使用較寬鬆留白（常用 `p-6`、`gap-4/6`）。
- **線條語言**：輪廓以中性線框為主（`neutral-200/800`）。
- **動畫簡化**：使用同一組 transition 時長與 easing，不做花俏動畫。
- **語意優先**：樣式由語意 class 驅動，不在頁面散落長 class 字串。

## 2) 強制規則：線框與底色擇一

每個元件（button / card / panel / item）在同一狀態下只能採一種視覺主體：

- **Outline 型**：有 `border`，背景必須透明（`bg-transparent`）
- **Fill 型**：有 `bg-*`，不得再加 `border`

例外僅限：

- 全畫面遮罩（如 Modal backdrop）
- 進度條軌道（非互動卡片類元件）

## 3) Token 與動效基準

檔案：`src/index.css`

- `--ui-page-bg` / `--ui-page-fg`：頁面底色與主要文字
- `--ui-muted-fg` / `--ui-faint-fg`：次要文字層級
- `--ui-border`：全站線框顏色
- `--ui-panel-bg` / `--ui-soft-bg`：面板與縮圖底色
- `--ui-focus-ring`：鍵盤焦點外框
- `--ui-transition-ms`：統一轉場時間
- `--ui-transition-ease`：統一 easing
- `--ui-color-danger`：危險色（含 dark mode 對應）

規範：

- 新增動效請優先沿用全域 token，不另開 `duration-*` 與自定 easing。
- 若需要特殊節奏（如倒數進度條）需明確註記用途。

## 4) 共用語意 class（src/app.css）

### Surface

- `.app-shell`：全站根容器
- `.app-header`、`.app-header-inner`：固定頂部工具列與最大寬度容器
- `.app-main`：主要頁面容器，統一最大寬度、左右 gutter 與頂部 offset
- `.ui-surface-outline`：線框型表面（outline）
- `.ui-surface-fill`：底色型表面（fill）
- `.ui-heading-hero`、`.ui-heading-page`、`.ui-body-muted`：常用排版層級

### Modal

- `.ui-modal-overlay`：Modal 容器
- `.ui-modal-backdrop`：背景遮罩
- `.ui-modal-panel`：內容面板（目前採 fill）
- `.ui-modal-panel-md`、`.ui-modal-panel-lg`：尺寸變體

### Button

- `AppButton`（`src/components/AppButton.tsx`）：全專案共用按鈕元件
- `.ui-btn-primary`：主要按鈕（fill）
- `.ui-btn-secondary`：次要按鈕（outline）
- `.ui-btn-cancel`：取消按鈕（無邊框）
- `.ui-btn-primary-pill`：主要 CTA（fill）

### Input / Segment / Motion

- `.ui-input-underline`：底線輸入欄位
- `.ui-segment`、`.ui-segment-option-*`：分段控制
- `SegmentedControl`（`src/components/SegmentedControl.tsx`）：全專案共用滑動式分段選擇元件
- `.ui-motion`：統一互動轉場（色彩/透明度/位移）
- `.ui-thumb-grid`、`.ui-image-thumb`：圖版縮圖網格與縮圖容器
- `.ui-thumb-remove-btn`、`.ui-icon-danger`：縮圖刪除與卡片危險操作
- `.ui-switch-row`、`.ui-switch-track-*`、`.ui-switch-knob`：切換開關

## 5) 圓角、間距、線框建議值

- **圓角**：卡片、面板、按鈕與小型控制優先 `rounded-md`（8px 以內）；主 CTA 可 `rounded-full`
- **卡片/面板內距**：`p-6` 為預設
- **清單卡片高度**：維持固定高度以保持節奏一致
- **線框粗細**：以 `border`（1px）為主，不混用多種粗細
- **按鈕文字**：統一置中（避免 `text-left`）
- **頁面寬度**：頁面與 header 內容使用 `.app-main` / `.app-header-inner` 的同一最大寬度，不在頁面內任意指定新的 `max-w-*`

## 6) 動畫一致性規範

- 互動元件必須有 transition（至少顏色或透明度）
- 避免 `transition-all`，改用明確屬性（如 `transition-opacity`）
- hover 回饋以「透明度 / 邊框色」為主，不用過度位移或縮放
- 分段選擇器滑動速度使用 `--ui-segment-transition-ms`（可比一般互動稍慢）

## 7) 可維護性規範

- 重複 class 超過 2 次即抽為語意 class
- `App.tsx` 條件樣式使用常數（如 `SEGMENT_OPTION_*`）
- 新增 UI 時，先選擇 `outline` 或 `fill`，不可同時套用
- 同類型按鈕寬度需一致（主要/次要/取消使用固定寬度）
