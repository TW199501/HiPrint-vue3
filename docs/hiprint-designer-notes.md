# Hiprint Vue3 設計器開發紀錄

> 專案：`hiprint-vue3`
> 內容：右鍵鎖定/解鎖、文字樣式與邊框設定彈窗、常用字體清單等開發過程與設計決策紀錄。

---

## 1. 功能總覽

### 1.1 元素鎖定 / 解鎖

- 在設計畫布上，針對非表格元素新增自訂右鍵選單：
  - **編輯位置與大小…**
  - **文字樣式…**（文字類元素）
  - **邊框設定…**
- **鎖定**：元素不可拖曳移動，但仍可透過彈窗直接輸入座標與寬高。
- **解鎖**：恢復可拖曳，座標與寬高可從畫布拖拉或彈窗數值調整。
- 鎖定狀態同步給 jQuery `hidraggable` 外掛，以避免 Hiprint 內部狀態不一致。

### 1.2 位置座標與大小彈窗（含鎖定控制）

- 透過 Ant Design Vue `Modal.confirm` 動態建立：
  - 顯示 X / Y（左、上）、寬度、⾼度四個欄位，型別皆為 `number`，**數字靠右對齊**。
  - 若元素當前為鎖定狀態，輸入框 `disabled`，並提示「需先解鎖」。
- 底部操作：
  - **解鎖**：套用當前輸入的座標與寬高，並將 `opts.draggable = true`。
  - **鎖定**：同樣套用座標與寬高，並將 `opts.draggable = false`。
  - 兩個按鈕都會呼叫 `designElement.updateDesignViewFromOptions()` 以刷新視圖。
- 關閉行為：
  - **右上角 X** 或 **點擊遮罩**：僅關閉彈窗，**不修改** 任任何位置、大小或鎖定狀態。

### 1.3 視覺化鎖定標記

- 在 Hiprint 的 `resize-panel` 外框上追加 CSS 狀態：
  - 一般選取：藍色邊框與陰影。
  - 鎖定選取：橘色邊框與陰影，明顯區分。
- 在鎖定元素的 `resize-panel` 中心新增一個 `div.hiprint-lock-badge`：
  - 顯示小鎖頭符號。
  - 使用絕對定位置中，`pointer-events: none` 以避免影響拖曳或點選。

### 1.4 文字樣式彈窗

- 新增「文字樣式…」右鍵選項，開啟自訂文字樣式彈窗。
- 採用 **4 × 3 的欄位排版**（每列 4 欄，總共 3 列）：
  1. 字體 / 字型大小 / 字體粗細 / 字距
  2. 文字顏色 / 背景顏色 / 文本修飾 / 左右對齊
  3. 上下對齊 / 文本換行 / 行高 / 旋轉角度
- 各欄位皆使用原⽣ HTML `<input>` / `<select>`：
  - **字體**：使用 `hiprintFontList` 生成 `<select>` 選單，第一項為「預設」，其餘為常用字體清單。
  - **字型大小 / 字距 / 行高 / 旋轉角度**：`input[type='number']`，**數字靠右對齊**。
  - **顏色**：`input[type='color']` 搭配自訂邊框樣式。
  - **文字修飾、對齊、換行** 等均以 `<select>` 提供常用選項。
- 單位顯示：
  - `pt` 與 `°` 直接合併到 label 文字，例如：
    - 「字型大小(pt)」
    - 「字間距(pt)」
    - 「字體行高(pt)」
    - 「旋轉角度(°)」
- 樣式：
  - 透過全域 `<style>`，將欄位寬度固定為 25% / 控制寬度為 80px，搭配較小間距 `gap`，看起來緊湊不擁擠。
  - 所有輸入/選擇框套用類 Ant Design 邊框與 focus 陰影，視覺風格統一。
  - 為了讓字體名稱多露出一些，左右 padding 調整為 `4px 5px`。

### 1.5 邊框設定彈窗

- 右鍵新增「邊框設定…」選項，開啟專用邊框/內距設定彈窗。
- 採用 **2 欄排版**，以列為單位排列：
  1. 左邊框 / 上邊框
  2. 右邊框 / 下邊框
  3. 邊框大小(pt) / 邊框顏色
  4. 左內邊距(pt) / 上內邊距(pt)
  5. 右內邊距(pt) / 下內邊距(pt)
- 邊框樣式下拉選單：
  - `''`（否）、`solid`（實線）、`dotted`（虛線）。
- **預設值設計**（依 Hiprint 原設定與實務需求）：
  - `borderWidth`：預設 `0.75pt`。
  - `contentPaddingLeft/Top/Right/Bottom`：預設 `2pt`。
- 數字欄位皆使用 `input[type='number']`，**靠右對齊**，風格與文字樣式彈窗保持一致。
- 點選「套用」會：
  - 同步更新 `designElement.options` 中的對應欄位。
  - 呼叫 `updateDesignViewFromOptions()` 重新渲染元素。

### 1.6 右鍵選單 UX 與樣式

- 自訂右鍵選單使用 jQuery 直接 append 至 `<body>`：
  - 只有非表格元素使用此自訂選單。
  - 表格仍保留 Hiprint 內建 `hicontextMenu` 行為，避免衝突。
- 全域 CSS 控制 `.hiprint-vue-contextmenu`：
  - 白底、灰邊、陰影、圓角，與 Ant Design 風格接近。
  - 項目 `.hiprint-vue-contextmenu-item`：
    - `cursor: pointer`，滑過時變成手指游標。
    - `:hover` 時顯示淡藍底色 `#e6f7ff` 與藍色文字 `#1890ff`，讓使用者清楚知道目前選到哪一行。

---

## 2. 字體設定與預設值

### 2.1 設計器字型清單 `hiprintFontList`

檔案：`src/config/hiprint-settings.js`

- 提供右鍵「文字樣式」彈窗的字體選單來源：
  - **繁體中文常用**：
    - 標楷體 `DFKai-SB`（目前亦為新元素預設字體）。
    - 新細明體 `PMingLiU`。
    - 微軟正黑體 `Microsoft JhengHei`。
    - Noto Sans TC `Noto Sans TC`。
    - Source Han Sans `SourceHanSansCN-Normal`。
  - **簡體中文常用**：
    - 宋體 `SimSun`。
    - 仿宋體 `FangSong`。
    - 微軟雅黑體 `Microsoft YaHei`。
  - **西文比例字體**：
    - Arial、Times New Roman、Calibri。
  - **數字用等寬字體**：
    - Consolas、Courier New、Lucida Console（皆為等寬字型）。
- 這些 entry 僅提供 `font-family` 名稱，實際字型檔來自使用者系統或自行佈署的 @font-face，不會隨專案一起散佈，避免版權爭議。

### 2.2 文字元素預設字體

檔案：`src/hiprint/hiprint.config.js`

- 調整 Hiprint 的 `text` 與 `longText` 預設設定：
  - `text.default.fontFamily = 'DFKai-SB'`
  - `longText.default.fontFamily = 'DFKai-SB'`
- 效果：
  - 新增文字 / 長文元素時，若系統安裝了標楷體，會直接以標楷體顯示與列印。
  - 既有模板中的元素不會被強制更改，維持原有字體。

---

## 3. 主要程式碼位置與關鍵函式

### 3.1 `src/views/DesignerView.vue`

- **右鍵選單與鎖定邏輯**：
  - `attachLockContextMenu()`：在設計畫布上掛載右鍵事件，區分表格與非表格元素。
  - `showElementContextMenu(designElement, $target, event)`：建立自訂 `<ul.hiprint-vue-contextmenu>` 選單並插入三個功能項目：
    - 編輯位置與大小… → `openLockPositionModal`。
    - 文字樣式… → `openTextStyleModal`。
    - 邊框設定… → `openBorderStyleModal`。

- **位置與大小 + 鎖定彈窗**：
  - `openLockPositionModal(designElement, $target)`：
    - 根據當前 `opts.left/top/width/height` 與 `opts.draggable` 建立內容 VNode。
    - `applyChanges(lock)`：套用數值、更新視圖、更新 `hidraggable`、維護鎖定 badge。
    - 使用 `Modal.confirm` + 自訂 `footer`（解鎖/鎖定）與 `maskClosable/closable` 控制關閉行為。

- **文字樣式彈窗**：
  - `openTextStyleModal(designElement)`：
    - 建立 4 × 3 版面的 VNode，欄位對應 `fontFamily/fontSize/fontWeight/letterSpacing/color/backgroundColor/textDecoration/textAlign/textContentVerticalAlign/textContentWrap/lineHeight/transform`。
    - 從 `hiprintFontList` 產生字體選項。
    - 處理預設值（例如 `fontSize = 14`）。
    - `applyChanges()` 寫回 `opts`，並呼叫 `updateDesignViewFromOptions()`。

- **邊框設定彈窗**：
  - `openBorderStyleModal(designElement)`：
    - 提供四邊框 + 邊框寬度/顏色 + 四向內距設定。
    - `getNumber` / `getInputValue` 讀取使用者輸入，並更新 `opts.borderLeft/Top/Right/Bottom/borderWidth/borderColor/contentPadding*`。
    - `updateDesignViewFromOptions()` 重新渲染。

- **樣式（同一檔案內 `<style>` 與全域 `<style>`）**：
  - `.text-style-modal`, `.text-style-row`, `.text-style-field`：控制 4 × 3 佈局與欄寬。
  - `.border-style-modal`, `.border-style-row`, `.border-style-field`：控制 2 欄邊框設定排版。
  - `.field-label`, `.field-control`：欄位標籤與控制項的統一寬度與樣式。
  - `input[type='number']` 在文字/邊框彈窗中皆強制 `text-align: right !important;`。
  - `.hiprint-vue-contextmenu*`：右鍵選單整體樣式與 hover 效果。
  - `.resize-panel.selected.locked` 與 `.hiprint-lock-badge`：鎖定中的外框與小鎖圖示樣式。

### 3.2 其他相關檔案

- `src/hiprint/hiprint.config.js`
  - 調整 `text` / `longText` 預設 fontFamily。
  - 理解 Hiprint 各元素的 `supportOptions` 及 `default` 結構，作為彈窗預設值設計依據。

- `src/config/hiprint-settings.js`
  - 定義 `hiprintSocketConfig`。
  - 定義 `hiprintFontList`，集中管理設計器可選字體清單。

---

## 4. UX 與實作決策備註

1. **不干擾 Hiprint 原生表格右鍵選單**：
   - 判斷元素類型，只對非表格元素掛自訂右鍵選單，避免跟 `hicontextMenu` 衝突。

2. **選擇原生 `<input type='number'>` 而非 AntD `InputNumber`**：
   - 在 `Modal.confirm` 的動態 VNode 中使用 `InputNumber` 曾出現無法編輯、小箭頭消失等問題，故改回原生 input 並以 CSS 調整外觀，兼顧可用性與視覺一致性。

3. **數字靠右對齊**：
   - 包含：位置/大小、文字樣式數值欄（大小、字距、行高、角度）、邊框大小與內距等欄位。
   - 符合一般數字欄位習慣，利於視覺對齊與比較。

4. **字體清單與版權考量**：
   - 清單中列出的多數為作業系統／Office 內建字型，只透過 `font-family` 名稱使用，不隨專案散佈字型檔。
   - 如需跨機器一致顯示，建議未來優先選用 Noto / Source Han 等開源字型並以 `@font-face` 載入。

5. **安全關閉 vs. 套用變更**：
   - 位置/大小彈窗特別設計：
     - X / 點遮罩：純關閉，不影響任何設定。
     - 底部按鈕：只有使用者明確點選「解鎖 / 鎖定」時才會實際更新座標、尺寸與鎖定狀態。

---

## 5. 未來可考慮的延伸

1. **鎖定狀態的多選批次操作**：
   - 支援一次鎖定/解鎖多個選取元素。

2. **更多字體策略**：
   - 提供「公司標準字型組合」快捷選項，或依語系/語言分類字體。

3. **預設樣式範本**：
   - 例如「標題」、「內容」、「備註」三種預設文字樣式，一鍵套用到選擇的元素。

4. **更直覺的鎖定圖示操作**：
   - 在選取框的小鎖頭上直接點擊即可切換鎖定/解鎖（目前僅作為狀態提示）。

---

> 本文件主要用來協助之後回顧與維護本次開發內容，若有新功能（例如更多右鍵選項或多語系 i18n 整合），建議持續在此檔案追加章節。
