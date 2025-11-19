# hiprint.bundle.js 核心結構筆記

> 專案：hiprint-vue3  
> 檔案：`src/hiprint/hiprint.bundle.js`（約 11k 行）

這份筆記是給日後維護／客製 Hiprint 用的**技術導覽**。不求覆蓋全部細節，而是抓出：

- `hiprint.bundle.js` 的**大架構**與關鍵類別
- 設計器中一個元素（例如文字）從 **options → 畫面 DOM** 的流向
- 右側屬性面板 / 我們自訂 UI 如何透過 `submitOption` / `updateOption` 影響元素
- 本專案目前已做的**關鍵客製點**（特別是字級與高度自動同步）

---

## 1. 最外層結構與匯入

`hiprint.bundle.js` 在這個專案裡不是單純的 UMD bundle，而是包在一個 ES Module 裡，最上面有：

- `import $ from "jquery"`
- 顏色選擇器：`@claviska/jquery-minicolors`（用在屬性面板）
- 條碼 / QRCode：`JsBarcode`、`./plugins/qrcode.js`、`bwip-js`
- 水印：`./plugins/watermark.js`
- 直接列印：`socket.io-client`
- PDF 匯出：`jspdf` + `@wtto00/html2canvas`
- 數字轉中文／金額：`nzh`
- SVG 轉 canvas：`Canvg`
- 預設元素型別提供者：`./etypes/default-etyps-provider`

同時會把：

- `window.$ = window.jQuery = $`
- `window.autoConnect = true`
- `window.io = io`

然後建立一個自製的 `i18n` 物件，透過 `import.meta.glob('../i18n/*.json', { eager: true })` 動態載入翻譯。

之後才進入原本 webpack bundle 的核心 `var hiprint = function (t) { ... }`，裡面有很多 module index（0,1,2,...）。

---

## 2. `hinnn` 全域工具命名空間

在 module `0` 裡會建立 `window.hinnn`，這是 Hiprint 內部大量使用的工具集合，包括：

- **事件系統** `hinnn.event`
  - `on(eventName, handler)` / `off` / `trigger` / `clear` / `getId` / `getNameWithId`
  - 整個 Hiprint 用 `"hiprintTemplateDataChanged_" + templateId` 這種事件名來追蹤設計器變更與 history。

- **單位轉換**
  - `hinnn.pt.toPx(pt)` / `toMm(pt)`
  - `hinnn.px.toPt(px)` / `toMm(px)`
  - `hinnn.mm.toPt(mm)` / `toPx(mm)`
  - 這些函式確保畫布上的元素尺寸可以在 **pt / px / mm** 之間正確轉換。

- **節流 / 防抖**：`hinnn.throttle(fn, wait, options)`、`hinnn.debounce(fn, wait, options)`

- **日期 / 數字格式化**：
  - `hinnn.dateFormat(value, format)`
  - `hinnn.numFormat(value, digits)`

- **數字轉中文大寫（金額等）**：`hinnn.toUpperCase(type, val)`  
  - 內部使用 `Nzh`，搭配不同 `type` 參數產生簡體／繁體、金額等格式。

這個命名空間在整個 bundle 中反覆被用來處理單位、事件與格式。

---

## 3. `HiPrintlib` 與 `PrintElementOptionEntity`

在 module `2` 裡有 `HiPrintlib` 類別（這裡用 `_HiPrintlib__WEBPACK_IMPORTED_MODULE_6__` 之類的命名）：

- 負責：
  - 產生 GUID：`guid()`
  - 管理正在拖曳的元素 `dragingPrintElement`
  - 用 `printTemplateContainer` 以 id 管理多個 `PrintTemplate` 實例

在 module `3` 附近有 `PrintElementOptionEntity`：

- 這是每個元素 options 的封裝類別：
  - `left`, `top`, `width`, `height`, `transform`, `defaultOptions`, ...
  - 提供 `setWidth`, `setHeight`, `displayWidth()`, `displayHeight()`, `getTop()`, `getLeft()` 等方法
- `setDefault(defaultOptions)` 會設定預設 options，並呼叫 `initSize()` 來建立初始寬高
- `getPrintElementOptionEntity()` 會從 entity 項目過濾出可以序列化的欄位（數字、字串、style 等）

這個 class 是**元素實際尺寸與位置**的真正來源，`BasePrintElement.options` 就是它的實例。

---

## 4. `HIPRINT_CONFIG` 與 `HiPrintConfig`

`src/hiprint/hiprint.config.js` 在瀏覽器裡會變成 `window.HIPRINT_CONFIG`。在 bundle 裡有一個 `HiPrintConfig` 類別（module `1`）：

- `HiPrintConfig.instance` 靜態單例，會從 `HIPRINT_CONFIG` 擴充自己：
  - `text`, `longText`, `panel`, ... 等型別的 `tabs` / `supportOptions` / `default` 都在這裡
- 我們在這個檔裡做了幾個重要設定（在原始 config 檔，而不是 bundle 檔）：
  - `text.default`: `width: 120`, `height: 14`, `fontFamily: 'DFKai-SB'`, `fontSize: 12`, `lineHeight: 14`
  - `longText.default`: `fontFamily: 'DFKai-SB'`, `fontSize: 12`（外加原本的寬高）

在 bundle 結尾還有一個 `cig(t)` 函式（我們的命名），用來：

- 確保只在第一次呼叫 `hiprint.setConfig` 時，記錄原始 `HIPRINT_CONFIG` 的 JSON
- 之後每次呼叫 `setConfig` 時：
  - 合併傳入的 partial config
  - 如果有 `optionItems` 陣列，會註冊額外的 option item 類別
  - 合併 `tabs` / `supportOptions` / `default` 等

這是未來如果要再擴充屬性面板的主要入口。

---

## 5. `BasePrintElement`：設計器中單一元素的核心類別

在 module `4`（左右行 652~1010）有 `BasePrintElement` 類別，是設計器內所有元素型別（text、longText、table、image...）的父類別。

### 5.1 建構子與基本欄位

- `constructor(printElementType)`
  - `this.printElementType`：對應 `HIPRINT_CONFIG.text` / `longText` / `image` 等的型別描述
  - `this.id`：由 `HiPrintlib.instance.guid()` 產生
  - `this.options`：後續由具體子類別設定（`new PrintElementOptionEntity(...)`）

### 5.2 重要方法

- `getConfigOptionsByName(name)`
  - 直接從 `HiPrintConfig.instance[name]` 取出該型別的 config（例如 `text`）。

- `getProxyTarget(extraOptions)`
  - 給左側「拖曳元件模板」用的，會根據當前 options 建立 DOM 預覽。

- `SetProxyTargetOption(t)`
  - 用於拖曳時，把自訂 options merge 到 `this.options`。

- `getDesignTarget(designPaper)`
  - 建立實際畫在「設計紙張」上的 DOM：
    - 呼叫 `this.getHtml(designPaper)[0].target` 取得主要 DOM
    - 綁定 click / dblclick 事件（包含 inline 編輯 text 的邏輯）
    - 綁定拖曳：`this.designTarget.hidraggable({ ... })`

- `design(paper, designPaper)`
  - 實際把元素放進設計紙張上：
    - 綁定拖曳（座標移動）
    - 呼叫 `setResizePanel()` 建立 resize handles
    - 綁定複製事件與鍵盤移動

- `setResizePanel()`
  - 內部呼叫 `this.designTarget.hireizeable({ ... })`：
    - `showPoints`: 哪些邊角可以拖拉
    - `draggable`: 元素是否允許刪除（決定右上角 X 按鈕）
    - `showSizeBox`: 是否顯示紅色 `寬 x 高` 小框
    - `onResize` / `onStopResize`: 更新 options 與觸發事件

- `updateSizeAndPositionOptions(left, top, width, height)`
  - 檢查是否超出 panel 邊界（配合 `willOutOfBounds` 設定）
  - 通過 `this.options.setLeft / setTop / setWidth / setHeight` 更新座標與尺寸

- `getPrintElementEntity(includeType)`
  - 把 options 與 element type 打包成可序列化物件，給存檔／匯出使用。

### 5.3 `submitOption()`：右側屬性面板 → options

`submitOption()` 是右側屬性面板按「確定」或 auto-submit 時呼叫的關鍵函式：

- 會先找出同類型且被選取的其他元素 `els`（多選同步修改用）
- 讀取 `this.getConfigOptions()`，找出所有 tabs 與 list（每個 list 項目就是一個 option item，例如 `fontSize`）
- 針對每個 tab：
  - **如果是樣式 tab 且有多選 `els`**：
    - 對 `tab.list` 中的每個 option item `e` 呼叫 `e.getValue()`
    - 把取得的值套用到所有 `ele.options` 裡
  - **否則（單一元素或非樣式 tab）**：
    - 單純把值寫回 `t.options`（當前元素）
- 在我們的專案中，這裡加了**客製邏輯**：
  - 若 option 名稱為 `fontSize`，且元素型別為 `text` 或 `longText`：
    - 把 `n` 轉成數字 `nextFontSize`
    - 若是有效數字，算出 `autoBoxSize = nextFontSize + 2`
    - 寫入：
      - `ele.options.height = autoBoxSize`
      - `ele.options.lineHeight = autoBoxSize`
    - 單一元素分支同理，改成 `t.options.*`

> 這一段就是「字級改變 → 高度/行高 = 字級 + 2」的**屬性面板版本**，可以同時處理多選元素與單選元素。

（原始 Hiprint 沒有這個規則，是我們加進去的。）

### 5.4 `updateOption(o, v, b)`：單一 option 更新入口

`updateOption` 是另一個非常重要的入口：

- 給外部程式（例如我們的 Vue3 DesignerView）呼叫，用於 **單一屬性** 更新
- 流程：
  1. 透過 `this.getConfigOptions()` 取得該型別 config
  2. 組出 `optionKeys`（所有支援的 option name）
  3. 如果 `o` 在 `optionKeys` 裡：
     - 如果是 `fontSize` 且型別為 `text`/`longText`：
       - （目前程式裡仍保留一段「視為 default box 才自動調整」的判斷；我們之後有計畫把它簡化）
       - 在 default box 條件下，把：
         - `this.options.height = nextFontSize + 2`
         - `this.options.lineHeight = nextFontSize + 2`
     - 接著 `this.options[o] = v`
     - 呼叫 `this.updateDesignViewFromOptions()` 重新渲染元素
     - 若 `!b`，則觸發 `hiprintTemplateDataChanged_<templateId>` 事件
  4. 最後同步更新屬性面板上對應的 input/select DOM 值

在我們的 Vue3 設計器中：

- 右鍵「文字樣式」彈窗內，我們使用 `designElement.updateOption('fontSize', value)` 來更新字級
- 因為這裡會呼叫 `updateDesignViewFromOptions()`，所以視覺上會立即刷新。

---

## 6. OptionItem 系統：屬性面板的「一格一格」控件

`hiprint.bundle.js` 中有一系列 `function t() { this.name = "xxx" }` 的小類別，例如：

- `name = "fontFamily"`
- `name = "fontSize"`
- `name = "lineHeight"`
- `name = "widthHeight"`
- `name = "color"` / `backgroundColor` / `borderWidth` ...

每個 option item 類別通常提供：

- `createTarget(printElement, options)`：回傳一段 `<div class="hiprint-option-item">...</div>` 的 jQuery DOM
  - 內含 `<input>` / `<select>` 等欄位
  - 會加上 `class="auto-submit"` 讓屬性面板能自動綁定到 `submitOption()`

- `getValue()`：
  - 從 DOM 讀出目前值（例如選取的字級）

- `setValue(value, options, printElementType)`：
  - 當第一次開啟屬性面板時，用現有 options 的值填入

- `css(target, value)`（可選）：
  - 負責把這個 option 轉成實際 CSS，套在元素 DOM 上

### 6.1 `fontSize` OptionItem

`fontSize` 的 option item 定義大概如下：

- `this.name = "fontSize"`
- `createTarget()`：
  - 產生一個 `<select>`，內建一組 pt 選項（6 ~ 21.75pt），第一個是「默認」空值
- `getValue()`：
  - 回傳選取的數值（浮點數）
- `css(target, e)`：
  - 若 `e` 有值：`t.css("font-size", e + "pt")`

### 6.2 `widthHeight` OptionItem

這是右側「寬高大小」那一格：

- `this.name = "widthHeight"`
- `createTarget(t, o)`：
  - 產生兩個 `<input type="number">`，一個寬、一個高
  - 另外有一個「🔗 / 🔓」按鈕代表同步寬高
- `getValue()`：
  - 回傳 `{ widthHeightSync, width, height }`
- `setValue(options, el)`：
  - 把 `options.width` / `options.height` 填回輸入框
- `css(target)`：
  - 在特定條件下（目前元素有被選中且沒有衝突）
  - 直接用 `t.css("width", v.width + "pt").css("height", v.height + "pt")` 修改 DOM

這裡可以看出 **DOM 真正使用的寬高值** 來源有兩種：

1. `BasePrintElement.updateTargetSize()` 呼叫 `options.displayWidth()/displayHeight()` 設定
2. `widthHeight.css()` 直接動 DOM style

也因此，只改 `options.height` 但沒讓 DOM 同步，就會出現「右邊數值更新，但畫布紅色 `size-box` 還是舊值」的現象。

---

## 7. Text / LongText 元素類別

### 7.1 Text：`class D extends BasePrintElement`

在大約行 8968 開頭，有 `D = function (t) { ... }`：

- 建構子：
  - `this.options = new O(n)`，`O` 是 `PrintElementOptionEntity`
  - `this.options.setDefault(new O(HiPrintConfig.instance.text.default).getPrintElementOptionEntity())`

- `getConfigOptions()`：
  - 回傳 `HiPrintConfig.instance.text`

- `getTitle()` / `getData()`：
  - 根據 options / field / testData 判斷顯示文字

- `updateTargetText(target, title, data, ..., rowIndex)`：
  - 把格式化後的文字寫入 `.hiprint-printElement-text-content`
  - 對 text / barcode / qrcode 有不同處理

- `updateDesignViewFromOptions()`：
  - 目前版本：
    - 只做 `this.css(this.designTarget, this.getData())` + `updateTargetText`
    - 沒有重新套用 `updateTargetSize`，這是我們看到盒子高度不同步的原因之一

### 7.2 LongText：`class w extends BasePrintElement`

在約 8728 行開始：

- 建構子：
  - `this.options = new b(n)`，`b` 也是一個 print option entity 類別
  - 同樣從 `HiPrintConfig.instance.longText.default` 取 default

- `getConfigOptions()`：回傳 `HiPrintConfig.instance.longText`
- `updateDesignViewFromOptions()`：
  - 重算整個長文字內容（包含換行、分頁）、更新 DOM
  - 同樣目前沒有直接呼叫 `updateTargetSize`，高度同步主要靠內部排版計算

這兩個類別搭配我們在 `submitOption`/`updateOption` 裡的邏輯，共同決定文字元素的字級、高度、行高與內容呈現。

---

## 8. Resize 插件與 `.size-box`

`hireizeable` 是 Hiprint 內建的 resize 套件（與 jQuery UI 類似）。相關程式在約 7470~7619 行：

- 每個元素的 `.resize-panel` 上會加：
  - 角落 / 邊緣的 `.resizebtn`（`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`）
  - 旋轉把手 `.r`
  - 刪除按鈕 `.del-btn`（條件性）
  - 一個 `.size-box` 元素，用來顯示當前寬高

`refreshSizeBox(t, box, o)`：

- 若 `this.options.showSizeBox` 為 `false`，直接 return
- 否則會：
  - 從元素 DOM 的 `style.width` / `style.height` 讀值
  - 顯示為 `"120pt x 14pt"` 這樣的字串

因此：

- 只改 `options.width/height` 而不改 DOM 的 `style.width/height` → 紅色框的數值不會更新
- 當我們透過 `widthHeight.css()` 或 resize handle 改變尺寸時，會寫回 DOM style，紅框就會更新

這點在我們處理字級自動影響高度時非常關鍵。

---

## 9. PrintTemplate 與 History

在約 10600 行開始，有 `ct = function () { function t(t, e) { ... } }`，也就是 `PrintTemplate` 類別：

- 負責：
  - 管理多個 panel（每一頁紙張）
  - 管理 `printElements` 陣列（畫布上的所有元素）
  - 建立 / 更新 history：
    - 透過監聽 `hiprintTemplateDataChanged_<templateId>` 事件
    - 每次事件觸發，就把新的 JSON 存入 `historyList`

- 支援 undo/redo：
  - 透過 `hiprintHistory` 之類的物件，對 `historyPos` 與 `historyList` 進行操作

- `buildSetting(printElement)`：
  - 用來產生右側屬性面板的 HTML
  - 會遍歷 `tabs` / `supportOptions`，建立對應的 option items
  - 每個 option item 的 `submit` 最後都指向 `printElement.submitOption()`

這也是為什麼我們只要改 `BasePrintElement.submitOption`，就可以控制整個 UI 系統裡所有 option 提交時的行為。

---

## 10. 本專案的重要客製點整理

目前在 `hiprint.bundle.js` 內，我們已經做過或依賴的客製重點有：

1. **全域字級 → 高度/行高 規則（text / longText）**
   - 在 `BasePrintElement.prototype.submitOption`：
     - 無論單選或多選，只要 option 名稱是 `fontSize` 且型別為 `text` / `longText`：
       - 將 `height` 與 `lineHeight` 設為 `fontSize + 2`
   - 在 `BasePrintElement.prototype.updateOption`：
     - 對 `fontSize` 也有相似邏輯（目前還保留 default-box 條件，後續有計畫簡化成無條件套用）
   - 目標是：
     - 不論從 **右側屬性面板** 還是我們的 **右鍵文字樣式 modal** 改字級，都能讓 options 高度與行高自動帶著跑。

2. **與 Vue3 DesignerView 整合**
   - 在 `DesignerView.vue` 裡，右鍵文字樣式 modal 會呼叫：
     - `designElement.updateOption('fontSize', nextFontSize)`
     - 以及 `updateOption` 的其他欄位
   - 因為 `updateOption` 內會呼叫 `updateDesignViewFromOptions()`，所以畫面會馬上刷新。

3. **目前正在調整的點：高度 DOM 同步問題**
   - 我們已注意到：
     - 單純改 `options.height` + `lineHeight` 並不足以更新畫布上的 `.size-box` 文本
     - 需要額外在 `updateDesignViewFromOptions()` 或其它地方呼叫 `updateTargetSize()`、或直接更新 DOM style
   - 這部份屬於後續優化，會在不破壞 Hiprint 原生邏輯的前提下，補上 DOM 同步。

---

## 11. 延伸閱讀與實作建議

若未來要再進一步客製 Hiprint，建議優先從以下幾個地方著手：

- **新增／修改屬性面板欄位**
  - 在 `hiprint.config.js` 的 `text.tabs` / `supportOptions` 增減欄位
  - 在 `hiprint.bundle.js` 的 option item 系列中新增對應的 `name` 類別

- **控制元素樣式邏輯**
  - 針對特定 option，在對應的 option item 類別中實作 `css(target, value)`
  - 或在各元素子類別的 `updateDesignViewFromOptions()` 實作客製 CSS 套用

- **攔截所有屬性更新**
  - 使用 `BasePrintElement.updateOption` 作為全域單一屬性更新的 hook
  - 使用 `BasePrintElement.submitOption` 作為「屬性面板一次提交」的 hook

- **與外部框架整合（Vue / React / ...）**
  - 建議盡量透過 `updateOption` / `submitOption` 這種公開方法，而不要直接改 DOM
  - 讓 Hiprint 自己負責 options → DOM 的映射，有利於未來升級 Hiprint 版本。

---

這份檔案的目的，是讓之後打開 `hiprint.bundle.js` 不需要再從 11k 行開始硬啃，而是可以先從這裡理解整體結構與關鍵擴充點，再去對應具體程式碼。
