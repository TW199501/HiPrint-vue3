# JNPF 對接重點筆記

## print2 送單流程摘要

1. 透過 `new hiprint.PrintTemplate({ template })` 建立模板實例（Vue 插件或自製流程皆可）。
2. 呼叫 `hiprintTemplate.print2(data, options)` 會：
   - 驗證桌面端連線 `clientIsOpened()`，未連線時直接 `alert` i18n 錯誤訊息。@src/hiprint/hiprint.bundle.js#10751-10778
   - 收集 `link[media=print][href*="print-lock"]` 內容，必要時呼叫 `styleHandler()` 追加 CSS（可用於客製 LNPF 樣式）。
   - 取得模板 HTML，與 CSS 一起送往 `sentToClient()`。
3. `sentToClient()` 會依 `options.printByFragments` 決定傳輸模式：
   - **同步**：直接組裝完整 HTML，產生 `id/templateId` 後呼叫 `hiwebSocket.send(payload)`。
   - **分片**：先 `getHtmlAsync()` 逐面板生成 HTML，再以 `hiwebSocket.sendByFragments()` 分段（預設 50,000 字元、10ms 間隔），適合巨量內容或避免 Socket 超時。@src/hiprint/hiprint.bundle.js#10798-10812

> **整合提示**：LNPF 若需特定標頭/指令，可在 `options.styleHandler` 或自訂 `print2` 包裝函式中插入，確保桌面客戶端解析時能辨識。

## hiwebSocket 事件與 API

- 初始化於 `hiprint.bundle.js`，預設連線 `http://localhost:17521`，token `vue-plugin-hiprint`。可透過 `hiwebSocket.setHost(host, token)` 改連線。@src/hiprint/hiprint.bundle.js#7736-7852
- 連線成功後觸發事件：`printSuccess_${templateId}`、`printError_${templateId}`、`printerList`、`clients`、`clientInfo`、`paperSizeInfo`、`ippPrinterConnected` 等。@src/hiprint/hiprint.bundle.js#7853-7888
- 暴露主要方法：
  - `send(payload)`、`sendByFragments(payload)`：送出列印任務。
  - `refreshPrinterList()`、`getPrinterList()`：同步印表機列表。
  - `ippPrint(options)`、`ippRequest(options)`：IPP 列印/資訊存取。
  - `getAddress(type, ...)`：取得客戶端網路資訊。

> **整合提示**：與 LNPF 溝通前建議先確認桌面客戶端是否支援自訂 `token`、是否需要 TLS 或跨網域調整。若 LNPF 有自身 Socket 服務，可改寫或包裹 `hiwebSocket` 以適配。

## 事件監聽與錯誤處理

- 任何 `PrintTemplate` 實例可透過 `hiprintTemplate.on('printSuccess', handler)`、`on('printError', handler)` 取得事件；內部以 `hinnn.event` 觸發。@src/demo/tasks/index.vue#275-294
- 佇列示例 (`demo/tasks/index.vue`) 採用 `concurrent-tasks` 控制併發，展示失敗重試與通知流程，可作為 LNPF 大量列印模式參考。@src/demo/tasks/index.vue#244-323

## 模板與資料格式

- 模板 JSON 由 `getJson()` 與 Demo 中的 `panel.js`、`template*.js` 提供範例，結構包含 `panels[] -> printElements[] -> { options, printElementType }`。
- Data 物件與模板 `field` 對應，如 `panel.js` 中使用 `count` 欄位；批次列印時 `tasksPrint()` 以 `printData` 填入。@src/demo/tasks/panel.js#1-51 @src/demo/tasks/print-data.js#1-4
- 若 LNPF 需要自訂欄位或附加 metadata，可擴充 `options` 傳入的 `printData`（模板中 `field` 名稱需一致）。

## IPP 與其他傳輸

- `hiwebSocket.ippPrint(options)`、`ippRequest(options)`：適用支援 IPP 的印表機，回應透過 `ippPrinterCallback`、`ippRequestCallback` 事件回傳。@src/hiprint/hiprint.bundle.js#7829-7888
- `getPaperSizeInfo(printer)` 可向客戶端查詢紙張資訊（僅 Windows 客戶端支援）。@src/hiprint/hiprint.bundle.js#7793-7806

## JNPF 對接建議

1. **確認客戶端能力**：是否兼容 hiprint 既有 Socket 協議（event 名稱 `news/printByFragments`），若不同需調整桌面端或在前端建立 adapter。
2. **安全性與網路**：若 LNPF 在局域網或需使用 HTTPS/TLS，可調整 `setHost` 指向對應服務，並確保桌面端支援自訂 token 驗證。
3. **樣式與 CSS**：LNPF 若有專用列印版面，可提供對應 CSS 於 `styleHandler()` 或將 `print-lock.css` 改為內部版本。
4. **任務監控**：依照 `demo/tasks` 設計，建立批次佇列與通知機制，並掛載 `printSuccess/printError` 以便紀錄 LNPF 回傳狀態。
5. **測試腳本**：建議撰寫自動化腳本（或整合測試）涵蓋：
   - 單筆 `print2`
   - 大量/分片列印
   - 自訂 provider 元素渲染
   - IPP 列印（若 LNPF 支援）

## 下一步

- 若需更細緻的 LNPF 協定對應（例如指令格式、資料編碼），可在此基礎上建立自訂 `hiwebSocket` wrapper 或改寫桌面端程式碼。
- 建議建立測試記錄與錯誤日誌收集，以便排查 LNPF 與 hiprint 組合下的相容性問題。
