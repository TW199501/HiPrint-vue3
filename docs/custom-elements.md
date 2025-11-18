# 自訂元素與 Provider 指南

## 背景

`vue-plugin-hiprint` 透過 Provider 組織拖拽元素。每個 Provider 控制左側元素清單與拖入畫布後的預設屬性，並可在初始化 `hiprint` 時切換。理解 Provider 架構後，即可針對不同業務場景客製化元素、自訂屬性欄位與預設模板。

## 原生預設 Provider

- `defaultElementTypeProvider` 於 `src/hiprint/etypes/default-etyps-provider.js` 中定義，並在匯出 bundle 時由 `hiprint.bundle.js` 提供。@src/hiprint/etypes/default-etyps-provider.js#1-152
- 透過 `context.addPrintElementTypes` 建立多個 `PrintElementTypeGroup`，`tid` 做為元素唯一識別，對應拖拽 DOM 的 `tid` 屬性。@src/demo/design/index.vue#200-319
- 可配置：
  - `type`: 指定 hiprint 內建元素型別（`text`、`table`、`image`…）。
  - `options`: 控制預設測試資料、欄位名稱、字型、行高等，對表格元素可調整欄位群組、列合併、右鍵選單等功能。

## 自訂 Provider 範例

Demo 中提供 `aProvider` / `bProvider` 兩種客製設計：@src/demo/custom/providers.js#1-444

```js
export const aProvider = function () {
  const addElementTypes = function (context) {
    context.removePrintElementTypes("aProviderModule");
    context.addPrintElementTypes("aProviderModule", [
      new hiprint.PrintElementTypeGroup("平台", [
        {
          tid: "aProviderModule.header",
          title: "單據表頭",
          type: "text",
          options: {
            testData: "單據表頭",
            fontSize: 16.5,
            hideTitle: true,
          },
        },
        // ...省略其他元素
      ]),
      // 其他群組...
    ]);
  };
  return { addElementTypes };
};
```

重點說明：

- **模組命名**：`context.removePrintElementTypes("aProviderModule")` 確保切換時清掉舊元素清單，`aProviderModule` 亦會成為模板儲存時的 key。@src/demo/custom/providers.js#5-236
- **元素屬性**：`options` 內可設定 `field`, `testData`, 對 `table` 也可配置 `columns`, `footerFormatter`, `rowsColumnsMerge` 等進階行為。@src/demo/custom/providers.js#132-188
- **群組分段**：`PrintElementTypeGroup` 第一個參數為顯示名稱（如「平台」、「庫管」），第二個參數為元素陣列，用於分分類別。

## 與畫面整合流程

1. **初始化 Provider**：
   - `hiprint.init({ providers: [provider.f] })` 將 Provider 傳入 hiprint。@src/demo/custom/index.vue#202-205
2. **建立拖拽清單**：
   - 清空並由 `hiprint.PrintElementTypeManager.build` 依 `provider.value`（亦是模組名）產生 DOM。@src/demo/custom/index.vue#206-208
3. **建立模板實例**：
   - `new hiprint.PrintTemplate({ template, settingContainer, paginationContainer })` 綁定畫布與屬性設定區。@src/demo/custom/index.vue#211-225
4. **維護模板資料**：
   - 透過 `hiprintTemplate.getJson()` / `update()` 存取模板，Demo 中以 `vue-ls` 存至 localStorage。@src/demo/custom/index.vue#302-315

## 自訂元素建議步驟

1. **建立 Provider 檔案**：依專案模組切分（例：不同客戶、不同票據），為每個模組產生 `PrintElementTypeGroup`。
2. **定義 `tid` 與 `field`**：確保 `tid` 具備唯一性並有明確命名；`field` 對應資料來源欄位名稱。
3. **設定 `options`**：
   - 文本元素：`fontSize`、`textAlign`、`textType`（可選 `barcode`、`qrcode`）。
   - 圖片元素：可透過 `custom` 標記並在設計器中提供預設圖。
   - 表格元素：使用 `fields`/`columns` 控制欄位，必要時撰寫 `rowsColumnsMerge` 或 `footerFormatter` 處理合併與小計。
4. **注册 Provider**：在初始化流程（例如 `hiprint.init`）載入自訂 Provider，或透過 UI 提供切換選項（參考 Demo 的 `modeList`）。
5. **測試拖拽及列印**：確認設計器顯示正常，`PrintTemplate` 預覽與 `print2` 靜默列印皆可取得預期資料。

## 常見問題

- **元素未顯示**：檢查 `tid` 是否與拖拽 DOM `data-tid` 一致，或是否在 `context.addPrintElementTypes` 中重新註冊模組。
- **預設資料未更新**：`options.testData` 僅用於設計畫布預覽，實際列印需提供對應資料（例如 `hiprintTemplate.print(printData)`）。
- **表格欄位無法調整**：需將 `editable`、`columnDisplayEditable` 等旗標設為 `true`，否則設計器中無法改動。

## Reference API

- hiprint `PrintElementTypeGroup`, `PrintTemplate`, `PrintElementTypeManager` 等類別皆由 `hiprint.bundle.js` 暴露，詳見官方文檔或 `apiDoc.md`。
- 更多自訂案例，可參考 `src/demo/design/index.vue` 與 `src/demo/custom/` 相關文件。
