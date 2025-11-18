# 多語系與版本管理指南

## 功能概覽

- **版本資訊來源**：`App.vue` 在載入時透過 `https://registry.npmmirror.com/vue-plugin-hiprint` 取得 npm 版本清單，並填入語系下拉選單及版本選擇。@src/App.vue#137-174
- **版本解析**：使用 `utils/decodeVer` 將語義化版本轉成可比較的數值（主要版本乘以 10^6，再加上尾碼）。@src/utils/index.js#12-25
- **語系資源**：`src/i18n/*.json` 為各語言字串檔，hiprint 初始化時依據指定語言載入。@src/i18n

## 版本流程

1. **初始化**：`App.vue` 於 `created` 讀取 `sessionStorage` 的 `version`，預設為 `development`。@src/App.vue#137-174
2. **拉取版本**：
   - `getVersion()` 建立 `XMLHttpRequest` 向 npm registry 取回所有版本資訊。
   - 成功後以 `Object.keys` 反向排序填入 `versions`，開發模式下會額外加入 `development` 選項。
3. **切換版本**：
   - `handleVerChange(val)` 將選擇存入 `sessionStorage`，呼叫 `location.reload()` 重新載入頁面。@src/App.vue#176-183
4. **版本門檻**：
   - `i18nSupport` 計算是否顯示語系下拉，條件為 `<選定版本> == development` 或 `decodeVer(version).verVal >= 55.8`。@src/App.vue#129-135
   - 若無語系支援，介面會隱藏語言切換控件。

## 語系切換

1. `handleLangChange(val)` 將選定語系寫入 `sessionStorage`，並重新載入頁面。@src/App.vue#184-191
2. `hiprint.init` 最終會根據 `hiprint.init` 傳入的 `lang` 設定 `i18n.lang`，未指定時預設 `cn`。@src/hiprint/hiprint.bundle.js#11204-11218
3. 各語系檔案（如 `en.json`、`ja.json` 等）提供設計器 UI 翻譯，需符合 hiprint 要求的 key 結構。

## 自訂版本與語系作法

- **版本來源**：
  - 可改寫 `getVersion()`，改以私有 registry 或後端 API 取得版本資訊。
  - 若需固定版本，亦可直接配置 `versions` 陣列並省略網路請求。
- **語系擴充**：
  - 複製 `src/i18n/*.json` 作為範本，新增新語系 JSON，於 `App.vue` 的 `languages` 陣列加入項目。
  - 確保 hiprint 初始化時傳入對應 `lang` 值，使 `i18n.lang` 設為新語言。
- **多版本差異化**：
  - 可使用 `decodeVer` 判斷版本是否高於特定門檻，再決定是否啟用某些功能或元素。

## 常見注意事項

- `location.reload()` 會重新載入整個頁面，若需避免重整，可改為使用 Vue 狀態管理器重新初始化 hiprint。
- `sessionStorage` 僅在同一分頁有效，部署時若需跨分頁共享，可換成 `localStorage` 或後端儲存。
- 調整語系或版本後需確保對應資源（CSS、provider 配置）與該版本相容。
- 若 npm registry 存取受阻，可切換到其他鏡像（如 jsDelivr），程式碼已保留註解供參考。@src/App.vue#147-154

## 延伸閱讀

- `docs/custom-elements.md`：元素 Provider 擴充流程。
- `docs/printing-integration.md`：列印與靜默列印整合。
- `CHANGELOG.md`：官方版本更新紀錄，可與 `decodeVer` 結合掌握功能變化。
