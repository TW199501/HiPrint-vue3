# 自訂字型整合筆記

## 目標

在 `hiprint` 列印流程中加入自家字型，確保拖拽設計、預覽、靜默列印（`print2`）都能套用。

## 1. 準備字型資源

1. 將 `.ttf/.woff` 檔案放至可公開讀取的位置，例如 `public/fonts/MyLNPF.ttf`。
2. 如需多種格式（`woff2`, `otf`），可一併提供以提高相容性。

## 2. 在列印流程注入字型

`print2` 會先抓取所有 `link[media=print]` CSS，再執行 `styleHandler()` 回傳的內容，最後把 CSS 與模板 HTML 一起送至桌面端（`hiwebSocket.send` 或 `sendByFragments`）。因此可利用 `styleHandler` 注入 `@font-face` 與元素樣式。@src/hiprint/hiprint.bundle.js#10751-10812

```js
this.$print2(
  provider,
  templateJson,
  printData,
  {
    styleHandler: () => `
      <style>
        @font-face {
          font-family: "MyLNPFFont";
          src: url("/fonts/MyLNPF.ttf") format("truetype");
          font-display: swap;
        }
        .lnpf-text { font-family: "MyLNPFFont"; }
      </style>
    `,
  }
);
```

> **備註**：`/fonts/MyLNPF.ttf` 需能被桌面列印客戶端存取；若 LNPF 客戶端無法連線，可將字型轉成 base64 內嵌。

## 3. 供設計器選用新字型

- 建立 `hiprint.PrintTemplate` 時，可傳入 `fontList` 參數或呼叫 `setFontList()`。Demo `printDesign` 即有 `fontList` 示範，可比照修改 @src/demo/design/index.vue#349-358。

```js
hiprintTemplate = new hiprint.PrintTemplate({
  template,
  fontList: [
    { title: "預設字型", value: "Microsoft YaHei" },
    { title: "LNPF 字型", value: "MyLNPFFont" },
  ],
});

// 或在初始化後指定
hiprintTemplate.setFontList([
  { title: "預設字型", value: "Microsoft YaHei" },
  { title: "LNPF 字型", value: "MyLNPFFont" },
]);
```

- 如需在元素屬性面板顯示此字型，可於自訂 provider 中的元素 `options.fontList` 加入相同項目。

## 4. 模板元素套用字型

- 在模板 JSON 的對應元素加上 `options.fontFamily: "MyLNPFFont"`。
- 亦可在設計器界面選擇剛加入的字型，或將元素包上 `.lnpf-text` 類別配合 CSS。

## 5. 驗證流程

1. 在瀏覽器中先以 `$print` 預覽，確認字型載入成功。若失敗，檢查字型 URL 是否可存取。@src/index.js#48-57
2. 執行 `$print2`，確保 LNPF 客戶端與 `hiwebSocket` 連線（`clientIsOpened()` 為 true）。
3. 檢視 LNPF 端輸出的樣張，確認字型套用無誤。

## 6. 常見問題

- **字型沒生效**：檢查 CSS 是否載入、元素 `font-family` 是否指向正確名稱。需注意大小寫。若為 Windows，字型名稱需與系統識別一致。
- **客戶端無法下載字型**：可將字型放在內網伺服器，或改用 base64 data URI；另確認桌面端是否允許跨網域存取。
- **列印預覽正常、靜默列印失敗**：`print2` 需桌面端支援 `styleHandler` 注入的字型，若 LNPF 客戶端解析 HTML 時有限制，須在客戶端側加字型註冊邏輯。

## 7. 進階建議

- 可結合 `docs/custom-elements.md` 的 provider 擴充流程，為特定文字元素預設 `fontFamily`。
- 若 LNPF 要求特定樣式，可在 `styleHandler` 中同時注入其他 CSS（如頁邊距、列印顏色）。
- 建議建立簡單測試模板並記錄成 `template*.js`，方便團隊共用。

此流程無需改動核心程式，即可驗證自訂字型整合是否成功。
