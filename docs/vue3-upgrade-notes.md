# Vue 3 升級技術文件

> 本文件說明如何在 `hiprint-vue3` 專案中完成 Vue 3 化、維運環境與測試要點，協助開發者快速回顧升級細節。

## 1. 專案定位

- 以 Vite + Vue 3 建立全新專案，與原 Vue 2 專案並存但完全獨立。
- 延續 hiprint 拖拽設計器與列印邏輯，朝 LNPF 整合方向持續開發。
- 所有 Vue 3 相關程式碼位於 `hiprint-vue3/` 目錄下。

## 2. 環境建置

```bash
# 專案根目錄 (Vue 2 Demo) – 可選
npm install
npm run serve        # http://localhost:8080/vue-plugin-hiprint/

# Vue 3 專案 (建議在此開發)
cd hiprint-vue3
npm install
npm run dev          # http://localhost:5173/ (Port 佔用會自動遞增)

# 清除模組
npm run clean        # 刪除 node_modules
```

## 3. 核心搬遷與結構

- 從舊專案複製 `src/hiprint/**`（bundle、plugins、css、etypes、config）、`src/demo/design/panel.js`、`src/demo/design/print-data.js`、`src/i18n/*.json`。
- 新增 `src/hiprint-plugin.js` 封裝 `$hiPrint/$print/$print2` 安裝流程。
- Vue 3 入口 `src/main.js` 掛載 Ant Design Vue 3 與 hiprint 插件。

## 4. 主要改寫

- `src/views/DesignerView.vue`：利用 Composition API 重建工具列、拖拽清單、畫布與 JSON 匯入/匯出功能。
- `src/components/HiprintPreview.vue`：改為 `<script setup>`，以 `v-model:open` 控制 AntD Modal，透過 jQuery 插入預覽 HTML。
- 新增 `src/config/hiprint-settings.js`：集中設定 socket host/token、自動連線、字型清單與列印樣式處理 (`styleHandler`)。

## 5. Vite 相容調整

| 項目 | Vue 2 寫法 | Vue 3 / Vite 寫法 |
| ---- | ---------- | ------------------ |
| `nzh` 匯入 | `import Nzh from 'nzh/dist/nzh.min.js'` | `import Nzh from 'nzh'` |
| `canvg` 匯入 | `import Canvg from 'canvg'` | `import { Canvg } from 'canvg'` |
| i18n 掃描 | `require.context('../i18n', ...)` | `import.meta.glob('../i18n/*.json', { eager: true })` |
| AntD 樣式 | `import 'ant-design-vue/dist/reset.css'` | `import 'ant-design-vue/dist/antd.css'` |
| 拖拽 DOM | 假設 `designTarget` 一定存在 | 加入 `el.designTarget` 判斷避免初期 `undefined` |

## 6. Socket 與字型設定

- `hiprintSocketConfig`：可透過 `.env` 覆寫 `VITE_HIPRINT_SOCKET_HOST/TOKEN`，預設會自動連線 `http://localhost:17521`。
- 若未啟動桌面列印端可將 `autoConnect` 改成 `false`，避免 console 持續出現 WebSocket 錯誤。
- `hiprintFontList`：維護字型顯示名稱與實際值，需配合系統字型或自訂 `@font-face` (建議在 `lnpf-print.css` 中宣告)。

## 7. 已知行為與測試建議

- **拖拽/屬性面板**：採 hiprint 原生設定；初始化時先執行 `hiprint.setConfig()` 再套入自訂字型，確保四個屬性分頁完整顯示。
- **預覽功能**：需拖入至少一個元素並呼叫 `previewRef.show`，若無內容請檢查 `hiprintTemplate` 是否成功初始化。
- **靜默列印 (`$print2`)**：仍依賴桌面端 Socket.IO 服務；未啟動時 console 會提示 `TransportError`，屬預期行為。
- **i18n**：已搬移 `src/i18n`，所有文案與 `__('計數')` 等呼叫恢復正常。

## 8. 檔案索引

- `src/main.js`：Vue 3 入口。
- `src/hiprint-plugin.js`：hiprint Vue 插件封裝。
- `src/views/DesignerView.vue`：設計器主畫面。
- `src/components/HiprintPreview.vue`：預覽對話窗。
- `src/config/hiprint-settings.js`：socket / 字型設定。
- `docs/vue3-upgrade-notes.md`（本檔）：升級紀錄。

## 9. 後續工作建議

1. 撰寫 README 說明 Vue 3 專案啟動與部署流程。
2. 增加自動化測試（例如拖拽流程、JSON 匯入匯出）。
3. 若要發布 npm 套件，可建立 CI/CD pipeline 以及版本管理策略。
4. 評估是否移除舊 Vue 2 專案或分離 repo，避免相依混淆。

---
如需補充或修正，歡迎更新本文件或在 docs 目錄中新增章節。
