# hiprint-vue3 設計器專案說明

本專案是將 **開源 HiPrint Vue 2 DEMO** 改寫為 **Vue 3 + Vite** 的示例專案，方便在現代前端技術棧中使用 HiPrint 進行列印模板設計、預覽與匯出。

> ⚠️ **版權聲明 / Copyright**  
> 本專案中的列印核心程式與範例模板，均來自原始開源專案 **HiPrint / vue-plugin-hiprint**。  
> 其版權與授權條款仍屬於原作者所有：  
>
> - jQuery Hiprint 2.5.4  
> - Copyright (c) 2016-2021 <www.hinnn.com>. All rights reserved.  
> - Licensed under the LGPL or commercial licenses（詳見原專案說明）  
> 本專案僅做為 **技術整合與學習示例**，不改變原作者對程式碼的版權與授權方式。

原專案（Vue 2 DEMO）參考來源：

- npm 套件：`vue-plugin-hiprint`  
- GitHub / 原始碼位置請依實際使用時填寫（例如：`https://github.com/` 下的對應專案）

---

## 技術棧（Tech Stack）

- **框架**
  - Vue 3（`script setup` 單檔元件）
  - Vite 開發與打包工具

- **UI 元件庫**
  - Ant Design Vue 3（按鈕、Modal、排版等）

- **列印相關核心**
  - HiPrint / vue-plugin-hiprint 核心程式（已打包為 `src/hiprint/hiprint.bundle.js`）
  - jQuery（供 hiprint 使用）
  - socket.io-client（與桌面列印客戶端通訊）
  - html2canvas + jsPDF（匯出 PDF）

- **其他常用套件**
  - lodash、nzh（數字轉中文）、bwip-js（條碼）、qrcode 等

---

## 專案結構簡介

僅列出與 HiPrint / 設計器相關的主要部分：

- `src/main.js`  
  建立 Vue App，掛載 Ant Design Vue 與 hiPrint 插件。

- `src/App.vue`  
  目前直接載入 `DesignerView.vue` 作為主畫面。

- `src/views/DesignerView.vue`  
  - Vue 3 版的模板設計頁面。  
  - 負責：
    - 工具列（紙張大小、縮放、旋轉、預覽、清空）
    - 左側拖拉元件列表
    - 中間設計畫布（呼叫 `hiprintTemplate.design(...)`）
    - 右側元素屬性設定區
    - 產生 `hiprintTemplate` 實例並傳給預覽元件

- `src/components/HiprintPreview.vue`  
  - 預覽 Modal，顯示由 `hiprintTemplate.getHtml()` 產生的列印 HTML。  
  - 透過 `hiprintTemplate.print(...)` / `hiprintTemplate.toPdf(...)` 完成列印與匯出。

- `src/hiprint/hiprint.bundle.js`  
  - 由原始 `vue-plugin-hiprint` 打包而來，包含所有核心邏輯。  
  - 檔頭已標明版權與授權，使用時請遵守原作者條款。

---

## 開發環境需求

- Node.js 建議版本：**16+ 或 18+**（與 Vite 相容即可）
- npm 或 pnpm 皆可，下文以 npm 為例

---

## 安裝與啟動方式

取得原始碼後（例如 `git clone` 之後），在專案根目錄 `hiprint-vue3` 下執行：

```bash
# 安裝依賴
npm install

# 開發模式（預設由 Vite 服務）
npm run dev
```

啟動完成後，依照 Vite 的輸出訊息，於瀏覽器開啟：

- 開發網址預設為：`http://localhost:5173/`

畫面會顯示：

- 左側：可拖拉的列印元件（文字、圖片、長文、表格等）
- 中間：HiPrint 設計畫布（A4 / A3 等尺寸，可縮放、拖拉元素）
- 右側：選中元素的屬性設定（字型、位置、邊框…）
- 上方：工具列（切換紙張、縮放、旋轉、預覽、清空）

### 打包與預覽

```bash
# 建置正式版靜態檔案
npm run build

# 使用 Vite 內建 server 預覽 build 結果
npm run preview
```

---

## 從 Vue 2 DEMO 升級到 Vue 3 的主要差異（簡要）

以下僅列出本專案目前已做的主要調整，供未來維護時參考：

- **框架差異**
  - 由 Vue 2 Options API 改為 Vue 3 `script setup` + Composition API。  
  - 路由、狀態管理目前未引入，保留最小化示例結構。

- **UI 與 Modal 差異**
  - Vue 2 版使用 `slot="title"` / `slot="footer"`；Vue 3 版改用 Ant Design Vue 3 的 `#title` / `#footer` slot 語法。  
  - Modal 綁定由 `:visible` 改為 `v-model:visible`。

- **預覽邏輯**
  - Vue 2 版在 `preview.vue` 透過 jQuery：
    - `$('#preview_content_design').html(hiprintTemplate.getHtml(printData))`
  - Vue 3 版改為：
    - 使用 `hiprintTemplate.getHtml(printData)` 拿到 jQuery / DOM 結果
    - 轉成 HTML 字串，繫結到 `<div v-html="previewHtml" />`
  - 同時調整預覽 Modal 寬度、捲動區，改善使用體驗。

- **縮放與顯示校正**
  - 設計畫布與預覽畫面皆維持 HiPrint 核心的縮放邏輯，外層只加上少量「視覺校正」係數，讓 Vue 3 版的畫面接近原始 DEMO（不影響實際列印與 PDF 尺寸）。

---

## 授權與致謝

本專案僅針對 HiPrint Vue 2 DEMO 做 **Vue 3 + Vite 的整合與包裝**，以利在現代專案中示範如何接入 HiPrint。所有列印核心邏輯、樣板與相關資源之著作權，均屬於原作者：

- jQuery Hiprint / vue-plugin-hiprint 作者及其團隊  
- 官方網站與聯絡方式請依原專案提供資訊為準

如需在商業專案中使用或修改 HiPrint，請務必參考原專案的授權條款（LGPL 或商業授權），並依原作者要求取得適當授權。
