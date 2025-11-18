# hiprint-main 對接指南

> 匯整 `docs/` 目錄下的筆記，便於對接 LNPF 或二次開發時快速查閱。

## 目錄

1. [專案架構](./architecture.md)
2. [自訂元素與 Provider](./custom-elements.md)
3. [列印流程整合](./printing-integration.md)
4. [多語系與版本管理](./i18n-and-versioning.md)
5. [客製字型整合](./font-integration.md)
6. [LNPF 對接重點](./integration-notes.md)
7. [建置與運行指南](./setup-and-run.md)
8. [Vue 3 設計器重構指南](./vue3-designer-migration.md)

---

## 1. 專案架構

概要介紹 `vue-plugin-hiprint` 的目錄結構、核心模組與資料流，幫助掌握整體設計與分工。適合新成員快速了解專案。@docs/architecture.md

## 2. 自訂元素與 Provider

說明如何擴充拖拽元素、設定 provider 群組，以及如何在模板中調整元素參數。包含來自 `demo/custom` 的實例與最佳實務。@docs/custom-elements.md

## 3. 列印流程整合

整理 `$print`、`$print2`、`hiprint.init` 等流程，涵蓋 Socket 連線、佇列列印、分片傳輸、IPP API 等進階功能，協助與桌面列印客戶端整合。@docs/printing-integration.md

## 4. 多語系與版本管理

記錄 `App.vue` 內的版本偵測、`decodeVer` 解析、多語系 JSON 資料來源與切換流程，亦包含客製版本來源與語系新增建議。@docs/i18n-and-versioning.md

## 5. 客製字型整合

步驟化介紹如何放置字型檔、透過 `styleHandler` 注入 `@font-face`、設定模板 `fontList` 與元素 `fontFamily`，並列出常見問題與驗證方式。@docs/font-integration.md

## 6. LNPF 對接重點

匯整 `print2`/`hiwebSocket` 深入分析、模板資料格式與分片傳輸策略，並提供 LNPF 實務整合建議與測試範例。@docs/integration-notes.md

## 7. 建置與運行指南

列出環境需求、安裝流程、開發伺服器、打包指令與清除依賴操作，並整理常見問題與相關文件連結。@docs/setup-and-run.md

## 8. Vue 3 設計器重構指南

說明如何在 Vue 3 專案中沿用 hiprint 資產、重寫設計器頁面、更新 UI 組件與測試驗證流程。@docs/vue3-designer-migration.md

---

如需新增章節，可在 `docs/` 下撰寫新的 `.md` 後，補充至此目錄並加入概要說明。
