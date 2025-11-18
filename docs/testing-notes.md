# 測試腳本說明

## 1. 單元測試（Vitest）

- 位置：`tests/hiprintPreview.spec.js`
- 目的：驗證 `HiprintPreview.vue` 的核心行為（顯示預覽、列印、PDF 輸出）。
- 執行環境：`happy-dom`，在 `vitest.config.js` 中設定。
- 執行指令：

  ```bash
  npm run test
  ```

  *請勿在此指令下執行 Playwright 測試，避免 `test.describe()` 在 Vitest 下觸發錯誤。*

## 2. 端對端測試（Playwright）

- 設定檔：`playwright.config.ts`
  - 自動啟動 `npm run dev -- --host 127.0.0.1 --port 5173`，測試結束後自動關閉。
  - 預設使用 Chromium + Desktop Chrome 配置。
- 測試腳本：
  1. `tests-e2e/designer-preview.spec.ts`：
     - 開啟首頁 → 確認畫布載入 → 點擊「預覽」按鈕 → 確認 Modal 顯示並含有內容 → 關閉 Modal。
  2. `tests-e2e/test-1.spec.ts`：Playwright codegen 產生的示例，可依需求刪除或調整。
- 執行指令：

  ```bash
  # 確保沒有手動跑的 npm run dev
  npm run test:e2e
  ```

  若第一次執行需安裝瀏覽器：`npx playwright install`

## 3. 常見問題

- `ERR_CONNECTION_REFUSED`：表示 5173 port 沒有啟動，請先停掉所有 `npm run dev`，再由 `npm run test:e2e` 自動啟動。
- `test.describe() ... configuration file` 錯誤：因在 `npm run test`（Vitest）時載入了 Playwright 測試檔案，請改用 `npm run test:e2e`。
- 若測試需等待畫布或 Modal，已在腳本中使用 `waitForFunction` / `modal.waitFor`；若新增場景，請依此模式調整。
