# hiprint-main 架構說明

## 專案定位

- 提供 `hiprint` 與 Vue 的整合封裝，透過 `vue-plugin-hiprint` 讓 Vue2/Vue3 專案快速導入拖拽式列印模板。
- 內含完整 Demo（拖拽設計、自訂元素、列印隊列、多面板、模板中心）作為實際範例與測試場域。
- 打包輸出 `dist/vue-plugin-hiprint.js`，也支援 jQuery / UniApp 以 `<script>` 方式引入。

## 目錄結構

```text
├─ docs/                ← 文件目錄（本檔案）
├─ public/              ← 靜態資源、入口 `index.html`
├─ src/
│  ├─ main.js           ← Vue 應用啟動，註冊全域插件
│  ├─ App.vue           ← Demo 首頁，切換場景、版本、語系
│  ├─ index.js          ← Vue 插件封裝（導出 hiprint、$print、$print2 等）
│  ├─ hiprint/          ← hiprint 核心封裝、樣式、插件、配置
│  ├─ demo/             ← 場景示例（design/custom/tasks/panels/templates）
│  ├─ i18n/             ← 多語系資源
│  └─ utils/            ← 共用工具（版本解析等）
├─ scripts/             ← 發佈、版本管理腳本
├─ webpack.config.js    ← 打包 vue-plugin-hiprint 的 webpack 設定
├─ vue.config.js        ← Demo 應用構建設定
├─ README.md            ← 專案說明、安裝與常見問題
└─ apiDoc.md            ← API 參考文件
```

## 核心組件

### `src/index.js`

- 匯入 `hiprint.bundle.js`（核心邏輯）、`hiprint.config`（全域配置）、必要 CSS。
- 定義 `hiPrintPlugin`：將 `hiprint` 綁定到 Vue 原型並提供 `$print`（預覽列印）與 `$print2`（靜默列印，需桌面客戶端）。
- 暴露 `autoConnect` / `disAutoConnect` 以方便與桌面列印客戶端進行 Socket.IO 連線。

### `src/hiprint/`

- `hiprint.bundle.js`：封裝的 hiprint 核心（拖拽、模板、列印、PDF/影像輸出等）。
- `hiprint.config.js`：透過 `window.HIPRINT_CONFIG` 設定元素屬性頁籤、吸附、縮放、歷史操作、紙張等預設行為。
- `css/`、`plugins/`、`etypes/`：提供 hiprint 所需樣式、自訂插件與元素類型。

### Demo 場景 (`src/demo/`)

- `design/`：完整拖拽設計器，含紙張、縮放、列印、PDF 匯出、IPP 列印等操作。
- `custom/`：演示自訂元素（provider）與拖拽行為。
- `tasks/`：展示列印任務佇列與批次列印，結合 Socket 客戶端。
- `panels/`：多面板模板配置與渲染示例。
- `templates/`：模板中心與示例 JSON，含匯入匯出流程。

### 其他重點

- `public/index.html`：載入 Bootstrap、print-lock.css 與載入指示器。
- `utils/index.js`：版本號解析邏輯，配合 npm registry 決定功能可用性（如多語系）。
- `src/i18n/`：語系字串，配合 Demo 中的語言切換。

## 典型運作流程（Demo）

1. `main.js` 建立 Vue 應用並全域註冊 `hiPrintPlugin` → `App.vue` 掛載。
2. `App.vue` 讀取 npm 版本資訊、顯示不同場景元件（`printDesign`、`printTasks`…）。
3. `src/demo/design/index.vue`：
   - 呼叫 `hiprint.init({ providers })` 初始化拖拽面板。
   - 建立 `new hiprint.PrintTemplate({ template })` 連結畫布與屬性面板。
   - 提供 `$print()` 預覽列印、`print2()` 靜默列印、`toPdf()` 匯出、元素屬性調整等功能示例。
4. 其他 demo 場景根據需求展示隊列列印、多面板、模板管理等。

## 擴充與整合建議

- **專案集成**：在 Vue 專案中 `import { hiPrintPlugin } from "vue-plugin-hiprint"; Vue.use(hiPrintPlugin);` 後即可透過 `this.$hiPrint`、`this.$print`、`this.$print2` 使用。
- **自訂元素**：依 `hiprint` provider 規範新增 `tid` 與對應配置，即可擴充拖拽元件。
- **靜默列印**：需配合桌面列印客戶端（Socket.IO），透過 `autoConnect` / `disAutoConnect` 管控連線。
- **多語系與版本**：利用 `decodeVer` 根據 npm 版本調整功能開關，語系文案於 `src/i18n/` 維護。

## 相關文件

- `README.md`：套件使用說明、常見問題、連結資源。
- `apiDoc.md`：列印 API 與元素配置詳細說明。
- `CHANGELOG.md`：版本更新紀錄。
