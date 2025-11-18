# Vue 3 設計器重構指南

> 將現有 `hiprint` 拖拽設計器從 Vue 2 Demo 拆出，移植至 Vue 3 專案並保留既有列印邏輯與樣式資產。

## 1. 現況與目標

- 套件核心 (`hiprint.bundle.js`、`hiprint.config.js`、CSS) 與 Vue 版本無耦合，可在 Vue 3 環境沿用。@src/index.js#1-85
- Vue 插件 (`hiPrintPlugin`) 已支援 `Vue.config.globalProperties`，在 Vue 3 可直接 `app.use(hiPrintPlugin)` 繼續取得 `$print` / `$print2`。@src/index.js#34-86
- 原 Demo 設計器頁面大量使用 `ant-design-vue@1.x` 與 Vue 2 Options API，需重寫為 Vue 3 相容語法。@src/demo/design/index.vue#1-339 @package.json#42-57

**重構目標**：於全新 Vue 3 專案中保留拖拽畫布、屬性面板、列印/匯出等功能，同時更新 UI 組件與程式結構。

## 2. 前置準備

1. **建立 Vue 3 專案**：建議使用 Vite (`npm create vite@latest`) 或 Vue CLI 5 (`vue create --preset vue3`).
2. **安裝相容 UI 庫**：改用 `ant-design-vue@^3` 或其他 Vue 3 UI 套件，並安裝 `@ant-design/icons-vue` 以替換舊 `<a-icon>` 寫法。
3. **拷貝必要資源**：
   - `src/hiprint/**`（包含 `plugins/`, `css/`, `etypes/`）。
   - `src/index.js` 作為 Vue 插件入口。
   - 需要的 Provider/模板資料（如 `src/demo/design` 底下的 `panel.js`、`print-data.js`）。
4. **引入樣式**：在 Vue 3 專案入口或專用樣式檔 import `hiprint/css/hiprint.css`、`hiprint/css/print-lock.css` 以及需用到的 Bootstrap/Ant Design CSS。@src/index.js#6-8 @src/demo/design/index.vue#197-335

## 3. 在 Vue 3 中註冊 hiprint 插件

```ts
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { hiPrintPlugin } from './hiprint/index' // 依實際路徑調整

const app = createApp(App)
app.use(hiPrintPlugin) // 預設掛載 $hiPrint、$print、$print2
app.mount('#app')
```

- 若需自訂掛載名稱或關閉自動連線，可使用 `app.use(hiPrintPlugin, '$hiprint', false)` 後，再透過 `autoConnect()` 手動啟用。@src/index.js#35-86
- 在組件中可透過 `const hiprint = getCurrentInstance()?.proxy?.$hiPrint` 取得核心物件，或使用 `app.config.globalProperties.$hiPrint`。

## 4. 重寫設計器頁面

### 4.1 模板結構

- 保留三欄佈局：左側 Provider 清單、中間畫布 (`#hiprint-printTemplate`)、右側參數面板 (`#PrintElementOptionSetting`)。@src/demo/design/index.vue#195-335
- 在 `<script setup>` 或 `defineComponent` 中以 `onMounted` 初始化 `hiprint`：

  ```ts
  onMounted(() => {
    hiprint.init({ providers: [new defaultElementTypeProvider()] })
    hiprintTemplate = new hiprint.PrintTemplate({ template: initialTemplate })
    hiprintTemplate.design('#hiprint-printTemplate')
  })
  ```

- 將舊 `data()` 狀態改為 `ref/ reactive` 管理，如紙張設定、縮放值、當前模板 JSON。

### 4.2 UI 組件替換

- 使用 `ant-design-vue@3` 時需改為 `v-model:open`/`v-model:value` 等新語法；原 `<a-icon type="printer">` 需改用 `<PrinterOutlined />` 等圖標元件。
- 舊 `@click="setElsAlign('left')"` 等邏輯可維持，但需確保對應元素已以 `ref` 綁定。

### 4.3 方法與事件

- 將原 Options API `methods` 改寫為函式：

  ```ts
  const print = () => hiprintTemplate?.print(printData)
  const print2 = () => hiprintTemplate?.print2(printData, { printer: selectedPrinter })
  ```

- 事件監聽 (`hiprintTemplate.on('printSuccess', ...)`) 需在初始化後註冊，並於 `onBeforeUnmount` 清除。
- 保留 JSON 匯入匯出、IPP 測試、對齊調整等功能時，可逐一搬運相對應函式；必要時拆分為多個組件便於維護。@src/demo/design/index.vue#66-193

## 5. 常見調整重點

| 項目 | Vue 2 寫法 | Vue 3 寫法 |
|------|------------|------------|
| 全域方法 | `this.$print()` | `const { proxy } = getCurrentInstance(); proxy?.$print()` |
| 雙向綁定 | `v-model="paperWidth"` | `v-model:value="paperWidth"`（依組件而定） |
| icon 使用 | `<a-icon type="printer" />` | `import { PrinterOutlined } from '@ant-design/icons-vue';` |
| Popover 顯示 | `v-model="paperPopVisible"` | `v-model:open="paperPopVisible"` |
| 組件註冊 | `components: { printPreview }` | 在 `setup` 中直接引入或 `app.component` 全域註冊 |

## 6. 測試與驗證

1. **功能回歸**：驗證拖拽、元素參數調整、模板保存/匯入、預覽與靜默列印。
2. **Socket 連線**：啟動桌面端後確認 `hiwebSocket` 事件（成功、失敗、印表機列表）仍正常。
3. **CSS 兼容**：確認 Bootstrap/Ant Design 與 hiprint 佈局無衝突，必要時覆寫樣式。
4. **瀏覽器支援**：以 Chrome/Edge 為主測試；若需 IE 相容性，需額外 polyfill。

## 7. 遷移風險與建議

- UI 套件升級為 Vue 3 版本時，樣式 class 與 DOM 結構可能變動，需重新調整自訂 CSS。
- 若未改寫 Options API 內 `this` 依賴，將導致執行期錯誤；建議逐步搬運並以 TypeScript/ESLint 輔助檢查。
- 先在分支完成 Vue 3 重構並建立自動化測試，再融合到主幹，以降低對既有 Vue 2 專案的干擾。

## 8. 後續擴充建議

- 視需求封裝為獨立 npm 套件，提供 Vue 3 使用者直接安裝。
- 建立 Storybook/Playwright 等驗證流程，確保拖拽與列印流程在 E2E 測試中穩定。
- 若將來需要 SSR 或 Nuxt 3，建議將 hiprint 相關邏輯延遲至 `onMounted` 以避免伺服器端渲染期錯誤。
