# hiprintTemplate 技術說明（Vue 3 版）

## 1. 這個文件在講什麼？

這份文件說明：

- `hiprintTemplate` 是什麼東西
- 它是在哪裡被建立的
- 它在設計畫布、預覽、列印、匯出 PDF 裡扮演什麼角色
- 你未來如果要加功能，要怎麼正確使用它

目標對象：**剛接觸 hiprint + Vue 3 的開發者**。

---

## 2. 整體觀念：三層架構

可以先把整個系統想成三層：

1. **hiprint 核心（[hiprint.bundle.js](cci:7://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:0:0-0:0)）**

   - 原始作者寫好的 jQuery / JS 套件。
   - 負責：
     - 紙張大小、尺規、拖曳、對齊
     - 元件（文字、條碼、表格…）排版與分頁
     - 印表、Socket、PDF 生成、產生 HTML
   - 對外提供一些類別與方法：`hiprint.PrintTemplate`, [hiprint.init](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:8199:4-8216:5), `hiprint.setConfig` 等。
2. **`hiprintTemplate`（PrintTemplate 的實例）**

   - 我們 new 出來的一個「模板控制器」物件。
   - **一個 hiprintTemplate = 一份正在編輯／預覽／列印的模板**。
   - 對外 API（常用）：
     - `design(selector, options)`：把設計畫布畫到指定 DOM。
     - `zoom(scale)`：縮放畫布。
     - [setPaper(widthMm, heightMm)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/views/DesignerView.vue:230:0-235:1)：設定紙張尺寸。
     - `getHtml(data)`：依資料產生列印用 HTML。
     - [print(data, options, callbacks)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:68:0-76:1)：直接印。
     - [toPdf(data, fileName)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:81:0-85:1)：匯出 PDF。
     - `getJson()` / [update(templateJson)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:7238:6-7244:7)：匯出 / 套用模板 JSON。
3. **Vue 3 UI（[DesignerView.vue](cci:7://file:///d:/app/hiprint-main/hiprint-vue3/src/views/DesignerView.vue:0:0-0:0) + [HiprintPreview.vue](cci:7://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:0:0-0:0)）**

   - 負責畫出：
     - 工具列（A4 / A3、縮放、旋轉、預覽、清空）
     - 左邊拖拉元件列表
     - 中間 A4 設計畫布
     - 右邊屬性設定
     - 預覽 Modal（`HiprintPreview`）
   - Vue **不自己算排版 / 分頁**，只是呼叫 `hiprintTemplate` 的方法。

---

## 3. `hiprintTemplate` 是在哪裡被建立的？

檔案：[src/views/DesignerView.vue](cci:7://file:///d:/app/hiprint-main/hiprint-vue3/src/views/DesignerView.vue:0:0-0:0)

### 3.1 變數宣告

```ts
const previewRef = ref(null)
let hiprintTemplate = null
```

- `previewRef`：用來拿到 `<HiprintPreview />` 的元件實例。
- `hiprintTemplate`：用來存放「目前這份模板」的物件（PrintTemplate 實例）。

### 3.2 初始化設計器 [initDesigner()](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/views/DesignerView.vue:183:0-209:1)

```ts
const initDesigner = () => {
  setupSocket()

  hiprint.init({
    providers: [new defaultElementTypeProvider()],
    lang: 'zh-cn'
  })

  hiprint.setConfig()
  hiprint.setConfig({
    fontList: hiprintFontList,
    styleHandler: lnpfStyleHandler
  })
  hiprint.PrintElementTypeManager.buildByHtml($('.ep-draggable-item'))

  hiprintTemplate = new hiprint.PrintTemplate({
    template: panel,
    settingContainer: '#PrintElementOptionSetting',
    paginationContainer: '.hiprint-printPagination',
    history: true,
    dataMode: 1
  })

  hiprintTemplate.design('#hiprint-printTemplate', { grid: true })
  // 這裡還會做縮放校正等額外設定
}
```

這裡在做的事可以拆成幾個步驟：

1. **[hiprint.init({...})](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:8199:4-8216:5)**

   - 指定：
     - 要用的元素 provider（`defaultElementTypeProvider`）
     - 語系（`lang: 'zh-cn'`）
   - 之後 hiprint 會用這些 provider 定義文字、表格、圖片等可拖拉元件。
2. **`hiprint.setConfig()` + 再 set 自訂設定**

   - 先還原全域設定，避免舊狀態殘留。
   - 再套上：
     - `fontList`: 可選字型
     - [styleHandler](cci:1://file:///d:/app/hiprint-main/src/demo/design/index.vue:873:8-876:9): LNPF 相關樣式處理
   - 不影響 Vue 本身，只影響 hiprint 的渲染行為。
3. **`buildByHtml($('.ep-draggable-item'))`**

   - 掃描畫面上所有左側的 `.ep-draggable-item`，
   - 讓這些元素可以拖到畫布上建立印刷元件。
4. **`hiprintTemplate = new hiprint.PrintTemplate({...})`**

   - **這行是重點**：真正 new 出 `hiprintTemplate` 實例。
   - 它接收的 options：
     - `template: panel`→ 預設模板 JSON（欄位、位置、線條等）。
     - `settingContainer: '#PrintElementOptionSetting'`→ 屬性設定 UI 要放在哪個 DOM。
     - `paginationContainer: '.hiprint-printPagination'`→ 分頁資訊顯示位置。
     - `history: true`→ 是否啟用撤銷/重做。
     - `dataMode: 1`
       → `getJson()` 回傳格式。
5. **`hiprintTemplate.design('#hiprint-printTemplate', { grid: true })`**

   - 把這份模板用「設計模式」渲染到中間畫布：
     - `#hiprint-printTemplate` 是畫布外層 DIV。
     - `{ grid: true }` 表示要顯示底下的格線。
6. 有額外的校正（例如縮放基準），也會在這裡順便調整。

> 總結：
> `hiprintTemplate` 在 [initDesigner()](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/views/DesignerView.vue:183:0-209:1) 裡被 new 出來並完成初始化，之後整個設計畫布都靠它來管理。

---

## 4. 在設計畫布中怎麼使用 `hiprintTemplate`？

### 4.1 縮放（Zoom）

```ts
const changeScale = (increase) => {
  let nextDisplay = state.scaleValue + (increase ? 0.1 : -0.1)
  nextDisplay = Math.min(state.scaleMax, Math.max(state.scaleMin, Number(nextDisplay.toFixed(2))))
  state.scaleValue = nextDisplay

  const internalScale = nextDisplay * DISPLAY_BASE_SCALE
  hiprintTemplate?.zoom(internalScale)
}
```

- `state.scaleValue` 是 UI 上顯示的比例（例如 1 → 100%）。
- `DISPLAY_BASE_SCALE` 是校正用係數（例如 0.9），讓畫面看起來接近舊版。
- `hiprintTemplate.zoom(scale)` 真正決定畫布的縮放程度。

### 4.2 設定紙張大小

```ts
const setPaper = (type, value) => {
  state.paperWidth = value.width
  state.paperHeight = value.height
  if (!hiprintTemplate) return
  hiprintTemplate.setPaper(value.width, value.height)
}
```

- 讓紙張寬高（mm）同步更新到模板內部。

### 4.3 匯出 / 套用模板 JSON

```ts
const exportJson = () => {
  if (!hiprintTemplate) return
  state.jsonOut = JSON.stringify(hiprintTemplate.getJson() || {}, null, 2)
}

const updateJson = () => {
  if (!hiprintTemplate || !state.jsonIn) return
  try {
    const parsed = JSON.parse(state.jsonIn)
    hiprintTemplate.update(parsed)
  } catch (error) {
    message.error(`更新失敗：${error}`)
  }
}
```

- `getJson()`：把目前模板狀態（元件位置、尺寸、內容…）輸出成 JSON。
- [update(json)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:7238:6-7244:7)：把一份 JSON 套回畫布。

---

## 5. `hiprintTemplate` 怎麼傳到預覽元件？

### 5.1 `DesignerView` 按下「預覽」按鈕

```vue
<a-button type="primary" @click="openPreview">
  <EyeOutlined /> 預覽
</a-button>
```

對應的方法：

```ts
const openPreview = () => {
  if (!hiprintTemplate) {
    message.warning('預覽尚未準備完成，請稍後再試或重新整理頁面')
    return
  }

  try {
    previewRef.value?.show(hiprintTemplate, printData)
  } catch (error) {
    message.error(`預覽失敗：${error}`)
  }
}
```

- `previewRef.value` 指向 `<HiprintPreview />` 元件實例。
- [show(hiprintTemplate, printData)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:43:0-69:1) 把 **同一個模板實例** 和顯示用 `printData` 傳進預覽元件。

---

## 6. 在 [HiprintPreview.vue](cci:7://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:0:0-0:0) 裡怎麼使用它？

檔案：[src/components/HiprintPreview.vue](cci:7://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:0:0-0:0)

### 6.1 接收與儲存實例

```ts
let hiprintTemplate = null
let printData = null

const show = (templateInstance, data, panelWidth = 210) => {
  hiprintTemplate = templateInstance
  printData = data
  width.value = templateInstance?.editingPanel?.width ?? panelWidth

  previewHtml.value = ''
  visible.value = true
  spinning.value = true

  nextTick(() => {
    const result = hiprintTemplate?.getHtml(printData)
    let html = ''

    if (typeof result === 'string') {
      html = result
    } else if (result && typeof result.html === 'function') {
      html = result.html() || ''
    } else if (result && result[0] && typeof result[0].outerHTML === 'string') {
      html = result[0].outerHTML
    }

    previewHtml.value = html
    spinning.value = false
  })
}
```

這裡做了幾件事：

- `hiprintTemplate = templateInstance`：把外面傳進來的實例存起來，之後 [print()](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:68:0-76:1) / [toPdf()](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:81:0-85:1) 都會用到這個物件。
- `width.value = templateInstance?.editingPanel?.width`：讀出目前紙張寬度（mm）來設定 Modal 的寬度。
- `getHtml(printData)`：
  產生「列印用的 HTML」，我們把它轉成字串後丟給 `<div v-html="previewHtml" />` 顯示。

### 6.2 預覽視窗大小

```vue
<a-modal
  v-model:visible="visible"
  :maskClosable="false"
  :width="`${width * PREVIEW_BASE_SCALE}mm`"
  :bodyStyle="{ maxHeight: '70vh', overflow: 'auto', padding: 0 }"
  @cancel="hideModal"
>
```

- `width` 來自 `hiprintTemplate.editingPanel.width`（紙張 mm）。
- `PREVIEW_BASE_SCALE` 是預覽用的視覺校正（例如 0.95），只影響畫面，不影響 PDF / 列印。

### 6.3 按「打印」按鈕

```ts
const print = () => {
  if (!hiprintTemplate) return
  waitShowPrinter.value = true
  hiprintTemplate.print(printData, {}, {
    callback: () => {
      waitShowPrinter.value = false
    }
  })
}
```

- 直接呼叫 [hiprintTemplate.print()](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:68:0-76:1)。
- `printData` 是你傳進來的資料（例如文字、條碼內容、表格資料…）。
- 第三個參數的 [callback](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:6645:12-6647:13) 在列印完成後會被呼叫，用來關閉 loading。

### 6.4 按「匯出 PDF」按鈕

```ts
const toPdf = () => {
  if (!hiprintTemplate) return
  // 與原 Vue 2 demo 保持一致：不傳入 printData，由模板內預設數據決定多頁內容
  hiprintTemplate.toPdf({}, '打印預覽')
}
```

- 呼叫 [hiprintTemplate.toPdf(...)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:81:0-85:1)，由 hiprint 核心負責 HTML → PDF。
- 這裡的寫法是參考原本 Vue 2 demo 的行為。

---

## 7. 對「封裝」的正確理解

- **封裝在套件裡的是 PrintTemplate 的內部實作**

  - 編譯好的 [hiprint.bundle.js](cci:7://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:0:0-0:0) 非常大，裡面包括：
    - 拖曳、鍵盤操作
    - 分頁演算法
    - 長文 / 表格切頁策略
    - HTML / PDF 生成
  - 這些不需要也不建議你去改。
- **我們可以操作的是：`hiprintTemplate` 實例與它的公開 API**

  - 只要你有這個實例：
    - 在畫布：`design`, `zoom`, [setPaper](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/views/DesignerView.vue:230:0-235:1), `getJson`, [update](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:7238:6-7244:7)
    - 在預覽 / 列印：`getHtml`, [print](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:68:0-76:1), [toPdf](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:81:0-85:1)
  - 不需要知道內部怎麼運算 DPI 或分頁，只要信任它提供的結果。

你可以把 `hiprintTemplate` 想成：

> 一個「印刷模板控制器物件」，
> Vue 只是幫它提供 UI（按鈕、畫布、預覽），
> 所有真正困難的事情都丟給這個物件去處理。

---

## 8. 未來常見擴充情境

- **新增一顆「只匯出模板 JSON」按鈕**

  - 在 [DesignerView.vue](cci:7://file:///d:/app/hiprint-main/hiprint-vue3/src/views/DesignerView.vue:0:0-0:0) 加：
    ```ts
    const saveTemplate = () => {
      if (!hiprintTemplate) return
      const json = hiprintTemplate.getJson()
      // 存檔到後端或 localStorage
    }
    ```
- **在別的畫面利用同一份模板做列印**

  - 從後端拿到 template JSON + data。
  - 建立 `hiprintTemplate`，呼叫 [update(templateJson)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/hiprint/hiprint.bundle.js:7238:6-7244:7) + [print(data)](cci:1://file:///d:/app/hiprint-main/hiprint-vue3/src/components/HiprintPreview.vue:68:0-76:1)。
- **做 API 列印（不經過 hiwebSocket）**

  - 用 `getHtml(data)` 產生 HTML，送給你的後端服務做 PDF 或印表機處理。
