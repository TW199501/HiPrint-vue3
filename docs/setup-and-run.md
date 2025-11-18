# 建置與運行指南

## 環境需求

- Node.js >= 16（建議使用 18 LTS；Node 22 亦可但會有部分舊套件的 engine 警告）。
- npm 8+（專案內建腳本使用 npm 指令）。
- （可選）桌面列印客戶端，如 electron-hiprint，用於測試 `$print2` 靜默列印。

## 初次建置

```powershell
# 安裝依賴
npm install
```

> 安裝過程可能出現 `@achrinza/node-ipc` 等套件的 engine 警告，原因是舊版套件未更新對 Node 22 的標示，可暫時忽略或降版 Node。

## 開發模式

```powershell
npm run serve
```

- 預設在 `http://localhost:8080/vue-plugin-hiprint/` 提供 Demo 頁面。
- 修改 `src/` 內容會自動熱更新。
- 若需變更 Base URL，可調整 `vue.config.js` 的 `publicPath`。

## 製作正式版

```powershell
# 建立 npm 套件輸出（dist/vue-plugin-hiprint.js）
npm run build

# 建立 Demo 應用的打包版本
npm run build-demo
```

- `npm run build` 使用 webpack（`webpack.config.js`），會輸出 `dist/vue-plugin-hiprint.js`。
- `npm run build-demo` 走 Vue CLI，輸出至 `dist/`，可部署於靜態主機。

## 清除依賴

```powershell
npm run clean
```

- 會刪除 `node_modules`，保留 `package-lock.json`。
- 若想連 lock 檔一起刪，可改寫為 `rimraf node_modules package-lock.json`。

## 常見問題

- **Engine 警告**：多為舊套件未更新，若需完全消除警告，可切換至 Node 16/18 或更新依賴版本。
- **安全性警告**：`npm audit` 會列出相依套件漏洞，可視需求執行 `npm audit fix` 或 `npm audit fix --force`。
- **列印客戶端**：`$print2` 需桌面端 Socket 服務，請先啟動 electron-hiprint 或自家 LNPF 服務並確認連線。

## 相關文件

- [專案架構](./architecture.md)
- [列印流程整合](./printing-integration.md)
- [客製字型整合](./font-integration.md)
- [LNPF 對接重點](./integration-notes.md)
