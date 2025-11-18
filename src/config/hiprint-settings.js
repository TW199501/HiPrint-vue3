export const hiprintSocketConfig = {
  host: import.meta.env.VITE_HIPRINT_SOCKET_HOST ?? 'http://localhost:17521',
  token: import.meta.env.VITE_HIPRINT_SOCKET_TOKEN ?? 'vue-plugin-hiprint',
  autoConnect: false, //自動連線
  autoReconnect: true,
};

// 在此維護設計器字型清單，value 須與實際 @font-face 或系統字型名稱一致
export const hiprintFontList = [
  // 繁體中文常用
  { title: '標楷體', value: 'DFKai-SB' },
  { title: '新細明體', value: 'PMingLiU' },
  { title: '微軟正黑體', value: 'Microsoft JhengHei' },
  { title: 'Noto Sans TC', value: 'Noto Sans TC' },
  { title: 'Source Han Sans', value: 'SourceHanSansCN-Normal' },

  // 簡體中文常用
  { title: '宋體 (SimSun)', value: 'SimSun' },
  { title: '仿宋體', value: 'FangSong' },
  { title: '微軟雅黑體', value: 'Microsoft YaHei' },

  // 西文比例字體
  { title: 'Arial', value: 'Arial' },
  { title: 'Times New Roman', value: 'Times New Roman' },
  { title: 'Calibri', value: 'Calibri' },

  // 數字用等寬字體
  { title: 'Consolas (等寬)', value: 'Consolas' },
  { title: 'Courier New (等寬)', value: 'Courier New' },
  { title: 'Lucida Console (等寬)', value: 'Lucida Console' },
];

export const lnpfStyleHandler = () => `
  <link rel="stylesheet" type="text/css" media="all" href="${window.location.origin}/lnpf-print.css" />
`;
