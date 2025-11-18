export const hiprintSocketConfig = {
  host: import.meta.env.VITE_HIPRINT_SOCKET_HOST ?? 'http://localhost:17521',
  token: import.meta.env.VITE_HIPRINT_SOCKET_TOKEN ?? 'vue-plugin-hiprint',
  autoConnect: false, //自動連線
  autoReconnect: true,
};

// 在此維護設計器字型清單，value 須與實際 @font-face 或系統字型名稱一致
export const hiprintFontList = [
  { title: '微軟正黑體', value: 'Microsoft JhengHei' },
  { title: 'Source Han Sans', value: 'SourceHanSansCN-Normal' },
  { title: 'LNPF 標準體', value: 'lnpf-standard' },
  { title: 'SimSun', value: 'SimSun' },
  { title: 'Noto Sans TC', value: 'Noto Sans TC' },
  { title: 'Arial', value: 'Arial' },
];

export const lnpfStyleHandler = () => `
  <link rel="stylesheet" type="text/css" media="all" href="${window.location.origin}/lnpf-print.css" />
`;
