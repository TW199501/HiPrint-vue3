# 列印流程整合指南

## 概覽

`vue-plugin-hiprint` 透過全域插件註冊列印 API，提供三種常見能力：

1. **預覽列印 (`$print`)**：在瀏覽器觸發系統列印預覽。
2. **靜默列印 (`$print2`)**：依賴桌面列印客戶端與 Socket.IO 連線，直接送單到印表機。
3. **進階佇列／碎片傳輸**：支援批次列印、分片傳送 HTML、IPP 列印等。

## Vue 插件入口與 API

- `src/index.js` 安裝時將 `hiprint` 綁定至 `Vue.prototype[$hiPrint]`，並註冊 `$print` / `$print2` 方法。@src/index.js#34-73
- 兩者皆會呼叫 `hiprint.init({ providers: [...] })` 建立元素 provider，再以 `new hiprint.PrintTemplate({ template })` 建立模板實例。@src/index.js#48-71
- `hiprintTemplate.print(...args)`：啟動瀏覽器列印預覽。
- `hiprintTemplate.print2(...args)`：走桌面客戶端靜默列印，需已成功連線。

### 插件選項

- `hiPrintPlugin.install(Vue, name = '$hiPrint', autoConnect = true)`：可自訂掛載名稱與自動連線行為。@src/index.js#35-74
- `autoConnect()` / `disAutoConnect()` 控制是否啟動 `hiwebSocket` 與桌面端溝通。@src/index.js#12-32

## Socket.IO 列印客戶端

- `hiprint.bundle.js` 內建 `window.hiwebSocket`，預設連向 `http://localhost:17521`，並提供多種 API：`start`、`stop`、`send`、`sendByFragments`、`getPrinterList` 等。@src/hiprint/hiprint.bundle.js#7736-7907
- `hiprint.init` 若偵測到 `window.autoConnect` 且與目前 host/token 不同，會自動重新連線。@src/hiprint/hiprint.bundle.js#11204-11218
- 成功連線後 `hiwebSocket` 會監聽/觸發事件，如 `printSuccess_${templateId}`、`printerList`、`ippPrinterCallback`，供程式註冊回呼。@src/hiprint/hiprint.bundle.js#7853-7888

### 典型靜默列印步驟

1. 在安裝插件時保持 `autoConnect = true`（預設值），或手動呼叫 `autoConnect(cb)`。
2. 確保桌面端（`electron-hiprint` 等）執行並開啟 Socket 伺服器。
3. 以 `$print2(provider, templateJson, data, options)` 觸發列印。
4. 透過 `hiprintTemplate.on('printSuccess', handler)` 或 `window.hiwebSocket` 事件追蹤結果（示例見任務佇列）。

## 批次／佇列列印範例

- `src/demo/tasks/index.vue` 使用 `concurrent-tasks` 以單一併發執行佇列列印，展示多筆列印任務串接。@src/demo/tasks/index.vue#244-323
- `tasksPrint()` 迴圈建立任務，逐筆呼叫 `realPrint`，每次建立新的 `hiprint.PrintTemplate` 並執行 `print2`。@src/demo/tasks/index.vue#244-295
- 成功／失敗事件透過 `hiprintTemplate.on('printSuccess'/'printError', ...)` 彈出通知，並在失敗時重排任務。@src/demo/tasks/index.vue#275-294
- UI 上以 `notification` 提示佇列狀態，可強制中止所有任務並 `runner.removeAll()`。@src/demo/tasks/index.vue#296-323

## 分片傳輸與其他 API

- `hiwebSocket.sendByFragments`：針對大型 HTML 內容提供分片傳送（預設每片 50,000 字元，10ms 間隔），客戶端需實作 `printByFragments` 事件處理。@src/hiprint/hiprint.bundle.js#7757-7784
- 其他重要 API：`refreshPrinterList`、`getPaperSizeInfo`、`ippPrint`、`ippRequest`，皆會發送對應事件並透過 `hinnn.event` 提供 callback。@src/hiprint/hiprint.bundle.js#7790-7890 @src/hiprint/hiprint.bundle.js#7815-7888

## 建議整合流程

1. **初始化**：
   - `Vue.use(hiPrintPlugin)`，必要時傳入自訂名稱或關閉自動連線。
   - 若需連線自訂主機，呼叫 `hiwebSocket.setHost(host, token)` 後 `autoConnect()`。
2. **Provider 準備**：
   - 建立或重用 `defaultElementTypeProvider` / 客製 provider，`hiprint.init({ providers })`。
3. **模板管理**：
   - 將模板 JSON 儲存於資料庫或 localStorage；列印時以 `new hiprint.PrintTemplate({ template })` 建立實例。
4. **列印觸發**：
   - 預覽：`$print(provider, templateJson, data, options)`。
   - 靜默：`$print2(provider, templateJson, data, { printer, title, ... })`。
5. **監控事件**：
   - 使用 `hiprintTemplate.on('printSuccess', handler)`、`on('printError', handler)` 或向 `hiwebSocket` 註冊 `printerList`、`clients` 事件。
6. **批量需求**：
   - 對大量任務，建議以 `concurrent-tasks` 或自製佇列控制併發，參考 demo 實現。

## 整合注意事項

- 靜默列印需搭配桌面端（預設 `localhost:17521`），部署正式環境時需關注 HTTPS/CORS 與客戶端憑證。
- 若要關閉自動連線（避免無桌面端時的錯誤），可在 `Vue.use(hiPrintPlugin, '$hiPrint', false)` 後，自行決定何時呼叫 `autoConnect()`。
- 分片列印需確保客戶端支援 `printByFragments`，並在 options 中提供唯一 `templateId` 以利事件對應。
- 表格資料量大時，建議先在後端生成 PDF 再列印，或搭配 `sendByFragments` 降低一次傳輸壓力。

## 相關參考

- `docs/custom-elements.md`：Provider 與元素擴充說明。
- `apiDoc.md`：hiprint 函式與元素選項詳細 API。
- 官方桌面客戶端（`electron-hiprint`）與 README 之常見問題，提供跨網域、HTTPS 設定建議。
