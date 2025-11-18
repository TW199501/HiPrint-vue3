import { createApp } from 'vue'
import App from './App.vue'

import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'

import { hiPrintPlugin } from './hiprint-plugin'

const app = createApp(App)

app
  .use(Antd)
  .use(hiPrintPlugin)

app.mount('#app')



