<template>
  <a-card class="designer-wrapper" :bordered="false">
    <div class="designer-toolbar">
      <a-space wrap>
        <a-button-group>
          <a-button
            v-for="(value, type) in paperTypes"
            :key="type"
            :type="curPaperType === type ? 'primary' : 'default'"
            @click="setPaper(type, value)"
          >
            {{ type }}
          </a-button>
        </a-button-group>

        <a-popover v-model:open="paperPopVisible" title="設定紙張寬高 (mm)" trigger="click">
          <template #content>
            <div class="popover-fields">
              <a-input-number v-model:value="paperWidth" :min="10" :max="1000" :step="1" />
              <span class="divider">×</span>
              <a-input-number v-model:value="paperHeight" :min="10" :max="1000" :step="1" />
              <a-button type="primary" block class="mt-2" @click="applyCustomPaper">套用</a-button>
            </div>
          </template>
          <a-button>自訂紙張</a-button>
        </a-popover>

        <a-button @click="changeScale(false)">
          <MinusOutlined />
        </a-button>
        <a-input-number
          :value="scaleValue"
          :min="scaleMin"
          :max="scaleMax"
          :step="0.1"
          disabled
          style="width: 90px"
          :formatter="(val) => `${Math.round(Number(val) * 100)}%`"
          :parser="(val) => Number((val || '0').replace('%', '')) / 100"
        />
        <a-button @click="changeScale(true)">
          <PlusOutlined />
        </a-button>
        <a-button @click="rotatePaper">
          <RedoOutlined /> 旋轉
        </a-button>
        <a-button type="primary" @click="openPreview">
          <EyeOutlined /> 預覽
        </a-button>
        <a-popconfirm title="確定要清空畫布？" ok-type="danger" @confirm="clearPaper">
          <a-button danger>
            <DeleteOutlined /> 清空
          </a-button>
        </a-popconfirm>
      </a-space>
    </div>

    <a-row :gutter="[12, 0]" class="designer-body">
      <a-col :span="4">
        <a-card class="panel-card" title="拖拽組件" size="small">
          <div class="hiprintEpContainer">
            <div class="drag_item_title">常規</div>
            <div class="drag-grid">
              <div class="drag_item_box" v-for="item in defaultElements" :key="item.tid">
                <a class="ep-draggable-item" :tid="item.tid">
                  <span class="icon">{{ item.icon }}</span>
                  <p class="label">{{ item.label }}</p>
                </a>
              </div>
            </div>
            <div class="drag_item_title">輔助</div>
            <div class="drag-grid">
              <div class="drag_item_box" v-for="item in helperElements" :key="item.tid">
                <a class="ep-draggable-item" :tid="item.tid">
                  <span class="icon">{{ item.icon }}</span>
                  <p class="label">{{ item.label }}</p>
                </a>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
      <a-col :span="15">
        <a-card class="panel-card">
          <div id="hiprint-printTemplate" class="hiprint-printTemplate"></div>
        </a-card>
      </a-col>
      <a-col :span="5">
        <a-card class="panel-card" title="元素屬性" size="small">
          <div id="PrintElementOptionSetting" class="setting-container"></div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[12, 12]" class="mt-3">
      <a-col :span="12">
        <a-card title="匯入模板 JSON" size="small">
          <a-textarea
            v-model:value="jsonIn"
            placeholder="貼上模板 JSON 後點擊下方按鈕更新"
            :rows="6"
          />
          <a-button type="primary" class="mt-2" @click="updateJson">更新畫布</a-button>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="匯出模板 JSON" size="small">
          <a-textarea v-model:value="jsonOut" :rows="6" readonly />
          <a-button class="mt-2" @click="exportJson">匯出目前模板</a-button>
        </a-card>
      </a-col>
    </a-row>

    <HiprintPreview ref="previewRef" />
  </a-card>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, toRefs } from 'vue'
import { message } from 'ant-design-vue'
import { MinusOutlined, PlusOutlined, RedoOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import $ from 'jquery'

import { hiprint, defaultElementTypeProvider, autoConnect, disAutoConnect } from '../hiprint-plugin'
import panel from '../hiprint-panel'
import printData from '../hiprint-print-data'
import HiprintPreview from '../components/HiprintPreview.vue'
import { hiprintSocketConfig, hiprintFontList, lnpfStyleHandler } from '../config/hiprint-settings'

const previewRef = ref(null)
let hiprintTemplate = null

const DISPLAY_BASE_SCALE = 0.9

const state = reactive({
  paperWidth: 210,
  paperHeight: 297,
  paperPopVisible: false,
  scaleValue: 1,
  scaleMin: 0.5,
  scaleMax: 5,
  jsonIn: '',
  jsonOut: '',
  socketHost: hiprintSocketConfig.host,
  socketToken: hiprintSocketConfig.token,
  autoConnect: hiprintSocketConfig.autoConnect,
  connectionStatus: 'unknown'
})

const paperTypes = {
  A3: { width: 420, height: 296.6 },
  A4: { width: 210, height: 296.6 },
  A5: { width: 210, height: 147.6 },
  B3: { width: 500, height: 352.6 },
  B4: { width: 250, height: 352.6 },
  B5: { width: 250, height: 175.6 }
}

const defaultElements = [
  { tid: 'defaultModule.text', icon: 'T', label: '文字' },
  { tid: 'defaultModule.image', icon: '🖼', label: '圖片' },
  { tid: 'defaultModule.longText', icon: '文', label: '長文' },
  { tid: 'defaultModule.table', icon: '表', label: '表格' },
  { tid: 'defaultModule.emptyTable', icon: '□', label: '空白表格' },
  { tid: 'defaultModule.html', icon: '</>', label: 'HTML' },
  { tid: 'defaultModule.customText', icon: '★', label: '自訂' },
  { tid: 'defaultModule.barcode', icon: '▤', label: '條碼' },
  { tid: 'defaultModule.qrcode', icon: '▣', label: 'QR Code' }
]

const helperElements = [
  { tid: 'defaultModule.hline', icon: '━', label: '橫線' },
  { tid: 'defaultModule.vline', icon: '┃', label: '直線' },
  { tid: 'defaultModule.rect', icon: '⬛', label: '矩形' },
  { tid: 'defaultModule.oval', icon: '⬭', label: '橢圓' }
]

const curPaperType = computed(() => {
  const { paperWidth, paperHeight } = state
  const match = Object.entries(paperTypes).find(([, size]) => size.width === paperWidth && size.height === paperHeight)
  return match ? match[0] : 'custom'
})

const { paperPopVisible, paperWidth, paperHeight, scaleValue, scaleMin, scaleMax, jsonIn, jsonOut } = toRefs(state)

const initDesigner = () => {
  setupSocket()

  hiprint.init({
    providers: [new defaultElementTypeProvider()],
    lang: 'zh-cn'
  })

  hiprint.setConfig()
  hiprint.setConfig({
    fontList: hiprintFontList,
    styleHandler: lnpfStyleHandler
  })
  hiprint.PrintElementTypeManager.buildByHtml($('.ep-draggable-item'))

  hiprintTemplate = new hiprint.PrintTemplate({
    template: panel,
    settingContainer: '#PrintElementOptionSetting',
    paginationContainer: '.hiprint-printPagination',
    history: true,
    dataMode: 1
  })

  hiprintTemplate.design('#hiprint-printTemplate', { grid: true })
  // 校正顯示倍率，讓 100% 對應舊版實際視覺大小
  hiprintTemplate.zoom(DISPLAY_BASE_SCALE)
  state.scaleValue = 1
  window.__hiprintIsReady = true
}

const setupSocket = () => {
  const { socketHost, socketToken, autoConnect: autoConnectEnabled } = state
  if (window.hiwebSocket?.hasIo?.()) {
    window.hiwebSocket.setHost(socketHost, socketToken)
    if (autoConnectEnabled) {
      autoConnect(updateConnectionStatus)
    } else {
      disAutoConnect()
    }
  }
}

const updateConnectionStatus = (status, message) => {
  state.connectionStatus = status ? 'connected' : 'disconnected'
  if (!status && message) {
    console.warn('Socket disconnected:', message)
  }
}

const setPaper = (type, value) => {
  state.paperWidth = value.width
  state.paperHeight = value.height
  if (!hiprintTemplate) return
  hiprintTemplate.setPaper(value.width, value.height)
}

const applyCustomPaper = () => {
  state.paperPopVisible = false
  if (!hiprintTemplate) return
  hiprintTemplate.setPaper(state.paperWidth, state.paperHeight)
}

const changeScale = (increase) => {
  let nextDisplay = state.scaleValue + (increase ? 0.1 : -0.1)
  nextDisplay = Math.min(state.scaleMax, Math.max(state.scaleMin, Number(nextDisplay.toFixed(2))))
  state.scaleValue = nextDisplay

  const internalScale = nextDisplay * DISPLAY_BASE_SCALE
  hiprintTemplate?.zoom(internalScale)
}

const rotatePaper = () => {
  hiprintTemplate?.rotatePaper()
}

const openPreview = () => {
  console.log('[DesignerView] openPreview clicked', {
    hiprintTemplateReady: !!hiprintTemplate,
    hasPreviewRef: !!previewRef.value
  })
  if (!hiprintTemplate) {
    console.warn('openPreview: hiprintTemplate is null, preview not initialized')
    message.warning('預覽尚未準備完成，請稍後再試或重新整理頁面')
    return
  }

  try {
    window.__previewClickCount = (window.__previewClickCount || 0) + 1
    window.__previewRefExists = !!previewRef.value
    previewRef.value?.show(hiprintTemplate, printData)
  } catch (error) {
    console.error('openPreview error', error)
    message.error(`預覽失敗：${error}`)
  }
}

const clearPaper = () => {
  try {
    hiprintTemplate?.clear()
  } catch (error) {
    message.error(`清空失敗：${error}`)
  }
}

const updateJson = () => {
  if (!hiprintTemplate || !state.jsonIn) return
  try {
    const parsed = JSON.parse(state.jsonIn)
    hiprintTemplate.update(parsed)
  } catch (error) {
    message.error(`更新失敗：${error}`)
  }
}

const exportJson = () => {
  if (!hiprintTemplate) return
  state.jsonOut = JSON.stringify(hiprintTemplate.getJson() || {}, null, 2)
}

onMounted(() => {
  window.__hiprintIsReady = false
  window.__hiprintOpenPreview = openPreview
  initDesigner()
})

onUnmounted(() => {
  window.__hiprintOpenPreview = undefined
  window.__hiprintIsReady = undefined
})
</script>

<style scoped>
.designer-wrapper {
  min-height: 100vh;
}

.designer-toolbar {
  margin-bottom: 16px;
}

.popover-fields {
  display: flex;
  align-items: center;
  gap: 8px;
}

.popover-fields .divider {
  font-size: 18px;
}

.drag_item_title {
  font-weight: 600;
  margin: 12px 0 4px;
}

.drag-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.drag_item_box {
  background: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 0;
}

.drag_item_box .ep-draggable-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.drag_item_box .icon {
  font-size: 20px;
}

.drag_item_box .label {
  margin: 4px 0 0;
}

.panel-card {
  height: 100%;
}

.hiprint-printTemplate {
  min-height: 70vh;
  background: #f7f9fc;
  border: 1px solid #e1e3eb;
}

.setting-container {
  min-height: 70vh;
}

.mt-2 {
  margin-top: 8px;
}

.mt-3 {
  margin-top: 16px;
}
</style>
