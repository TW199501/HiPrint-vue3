<template>
  <a-modal
    v-model:visible="visible"
    :maskClosable="false"
    :width="`${width * PREVIEW_BASE_SCALE}mm`"
    :bodyStyle="{ maxHeight: '70vh', overflow: 'auto', padding: 0 }"
    @cancel="hideModal"
  >
    <template #title>
      <a-space>
        <span style="margin-right: 16px">打印预览</span>
        <a-button :loading="waitShowPrinter" type="primary" @click.stop="print">打印</a-button>
        <a-button type="primary" @click.stop="toPdf">匯出 PDF</a-button>
      </a-space>
    </template>

    <a-spin :spinning="spinning" style="min-height: 100px">
      <div class="preview-container" v-html="previewHtml"></div>
    </a-spin>

    <template #footer>
      <a-button type="default" @click="hideModal">關閉</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const PREVIEW_BASE_SCALE = 0.95

const visible = ref(false)
const spinning = ref(true)
const waitShowPrinter = ref(false)
const width = ref(0)
const previewHtml = ref('')
let hiprintTemplate = null
let printData = null

const hideModal = () => {
  visible.value = false
}

const show = (templateInstance, data, panelWidth = 210) => {
  hiprintTemplate = templateInstance
  printData = data
  width.value = templateInstance?.editingPanel?.width ?? panelWidth

  previewHtml.value = ''
  visible.value = true
  spinning.value = true

  nextTick(() => {
    const result = hiprintTemplate?.getHtml(printData)
    let html = ''

    if (typeof result === 'string') {
      html = result
    } else if (result && typeof result.html === 'function') {
      // jQuery 物件：使用 .html() 取得內容
      html = result.html() || ''
    } else if (result && result[0] && typeof result[0].outerHTML === 'string') {
      // DOM 節點陣列：取第一個節點的 outerHTML
      html = result[0].outerHTML
    }

    previewHtml.value = html
    spinning.value = false
  })
}

const print = () => {
  if (!hiprintTemplate) return
  waitShowPrinter.value = true
  hiprintTemplate.print(printData, {}, {
    callback: () => {
      waitShowPrinter.value = false
    }
  })
}

const toPdf = () => {
  if (!hiprintTemplate) return
  // 與原 Vue 2 demo 保持一致：不傳入 printData，由模板內預設數據決定多頁內容
  hiprintTemplate.toPdf({}, '打印預覽')
}

defineExpose({ show })
</script>

<style scoped>
:deep(.ant-modal-body) {
  padding: 0;
}

:deep(.ant-modal-content) {
  margin-bottom: 24px;
}

.preview-container {
  min-height: 100px;
  padding: 24px;
  background: #f5f5f5;
}

.preview-container :deep(.hiprint-printTemplate) {
  margin: 0 auto;
}

.preview-container :deep(.hiprint-printPanel) {
  margin: 0 auto 24px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 16px;
}
</style>
