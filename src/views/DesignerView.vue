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
          <div class="setting-container-wrapper">
            <div id="PrintElementOptionSetting" class="setting-container"></div>
            <div class="setting-placeholder">
              請先在畫布上選擇一個元素
            </div>
          </div>
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
import { computed, h, onMounted, onUnmounted, reactive, ref, toRefs } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { MinusOutlined, PlusOutlined, RedoOutlined, EyeOutlined, DeleteOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons-vue'
import $ from 'jquery'

import { hiprint, defaultElementTypeProvider, autoConnect, disAutoConnect } from '../hiprint-plugin'
import panel from '../hiprint-panel'
import printData from '../hiprint-print-data'
import HiprintPreview from '../components/HiprintPreview.vue'
import { hiprintSocketConfig, hiprintFontList, lnpfStyleHandler } from '../config/hiprint-settings'

const previewRef = ref(null)
let hiprintTemplate = null
let lastCommittedTemplateJson = null
let lastCommittedTemplateStr = ''
let isRevertingTemplateChange = false

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

const handleTemplateDataChanged = (changeType, json) => {
  if (isRevertingTemplateChange) return

  if (changeType !== '移动') {
    lastCommittedTemplateJson = json ? JSON.parse(JSON.stringify(json)) : null
    lastCommittedTemplateStr = lastCommittedTemplateJson ? JSON.stringify(lastCommittedTemplateJson) : ''
    return
  }

  const currentSnapshot = json ? JSON.parse(JSON.stringify(json)) : null
  const currentSnapshotStr = currentSnapshot ? JSON.stringify(currentSnapshot) : ''

  if (!currentSnapshotStr || currentSnapshotStr === lastCommittedTemplateStr) {
    // 沒有實際變化，不需要再次詢問
    return
  }

  Modal.confirm({
    title: '確認移動元素？',
    content: '是否要保留這次位置調整？',
    okText: '保留',
    cancelText: '還原',
    onOk() {
      lastCommittedTemplateJson = currentSnapshot
      lastCommittedTemplateStr = currentSnapshotStr
    },
    onCancel() {
      if (!hiprintTemplate || !lastCommittedTemplateJson) return
      isRevertingTemplateChange = true
      try {
        hiprintTemplate.update(lastCommittedTemplateJson)
      } catch (error) {
        message.error(`還原失敗：${error}`)
      } finally {
        isRevertingTemplateChange = false
      }
    }
  })
}

const openLockPositionModal = (designElement, $target) => {
  const opts = designElement.options
  if (!opts) return

  const currentlyDraggable = opts.draggable !== false

  const modalIdBase = `hiprint-lock-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const idLeft = `${modalIdBase}-left`
  const idTop = `${modalIdBase}-top`
  const idWidth = `${modalIdBase}-width`
  const idHeight = `${modalIdBase}-height`

  const disabledInputs = !currentlyDraggable

  const contentVNode = h('div', { class: 'lock-position-modal' }, [
    h('div', { class: 'lock-position-row' }, [
      h('span', { class: 'group-label' }, '位置座標'),
      h('div', { class: 'lock-field-group' }, [
        h('input', {
          id: idLeft,
          type: 'number',
          value: opts.left ?? 0,
          disabled: disabledInputs,
          style: 'width: 90px;'
        })
      ]),
      h('div', { class: 'lock-icon-group' }, [
        h(currentlyDraggable ? UnlockOutlined : LockOutlined, {
          class: ['lock-icon', currentlyDraggable ? 'unlocked' : 'locked']
        })
      ]),
      h('div', { class: 'lock-field-group' }, [
        h('input', {
          id: idTop,
          type: 'number',
          value: opts.top ?? 0,
          disabled: disabledInputs,
          style: 'width: 90px;'
        })
      ])
    ]),
    h('div', { class: 'lock-position-row' }, [
      h('span', { class: 'group-label' }, '寬高大小'),
      h('div', { class: 'lock-field-group' }, [
        h('input', {
          id: idWidth,
          type: 'number',
          value: opts.width ?? 0,
          disabled: disabledInputs,
          style: 'width: 90px;'
        })
      ]),
      h('div', { class: 'lock-icon-group lock-icon-placeholder' }, [
        h(currentlyDraggable ? UnlockOutlined : LockOutlined, {
          class: ['lock-icon', currentlyDraggable ? 'unlocked' : 'locked']
        })
      ]),
      h('div', { class: 'lock-field-group' }, [
        h('input', {
          id: idHeight,
          type: 'number',
          value: opts.height ?? 0,
          disabled: disabledInputs,
          style: 'width: 90px;'
        })
      ])
    ]),
    currentlyDraggable
      ? h('div', { class: 'lock-tip' }, '可直接輸入座標與寬高，按下「鎖定」後將固定位置。')
      : h('div', { class: 'lock-tip' }, '目前為鎖定狀態，無法修改座標與寬高，如需調整請先解鎖。')
  ])

  const applyChanges = (lock) => {
    const getNumber = (id, fallback) => {
      const root = document.getElementById(id)
      if (!root) return fallback
      let el = root
      if (el.tagName !== 'INPUT') {
        el = root.querySelector('input')
        if (!el) return fallback
      }
      const v = parseFloat(el.value)
      return Number.isNaN(v) ? fallback : v
    }

    const nextLeft = disabledInputs ? opts.left : getNumber(idLeft, opts.left ?? 0)
    const nextTop = disabledInputs ? opts.top : getNumber(idTop, opts.top ?? 0)
    const nextWidth = disabledInputs ? opts.width : getNumber(idWidth, opts.width ?? 0)
    const nextHeight = disabledInputs ? opts.height : getNumber(idHeight, opts.height ?? 0)

    opts.left = nextLeft
    opts.top = nextTop
    opts.width = nextWidth
    opts.height = nextHeight

    try {
      if (typeof designElement.updateDesignViewFromOptions === 'function') {
        designElement.updateDesignViewFromOptions()
      }
    } catch (e) {
      // ignore
    }

    const nextDraggable = !lock
    opts.draggable = nextDraggable
    try {
      $target.hidraggable('update', { draggable: nextDraggable })
    } catch (e) {
      // ignore
    }

    // 視覺上標記鎖定狀態：在選取外框加上 locked 樣式與小鎖頭標記
    const $resizePanel = $target.find('.resize-panel')
    if ($resizePanel && $resizePanel.length) {
      const $badge = $resizePanel.find('.hiprint-lock-badge')
      if (lock) {
        $resizePanel.addClass('locked')
        if (!$badge.length) {
          const badge = $('<div class="hiprint-lock-badge">🔒</div>')
          $resizePanel.append(badge)
        }
      } else {
        $resizePanel.removeClass('locked')
        if ($badge.length) {
          $badge.remove()
        }
      }
    }

    message.success(nextDraggable ? '已解鎖，可拖動此元素' : '已鎖定，無法拖動此元素')
  }

  Modal.confirm({
    title: '位置座標與大小',
    icon: null,
    content: contentVNode,
    okText: '鎖定',
    cancelText: '解鎖',
    maskClosable: true,
    closable: true,
    onOk() {
      applyChanges(true)
    },
    onCancel() {
      applyChanges(false)
    }
  })
}

const openTextStyleModal = (designElement) => {
  const opts = designElement.options
  if (!opts) return

  const modalIdBase = `hiprint-textstyle-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const idFontFamily = `${modalIdBase}-fontFamily`
  const idFontSize = `${modalIdBase}-fontSize`
  const idFontWeight = `${modalIdBase}-fontWeight`
  const idColor = `${modalIdBase}-color`
  const idLetterSpacing = `${modalIdBase}-letterSpacing`
  const idBgColor = `${modalIdBase}-bgColor`
  const idTextDecoration = `${modalIdBase}-textDecoration`
  const idTextAlign = `${modalIdBase}-textAlign`
  const idVAlign = `${modalIdBase}-vAlign`
  const idTextWrap = `${modalIdBase}-textWrap`
  const idLineHeight = `${modalIdBase}-lineHeight`
  const idRotate = `${modalIdBase}-rotate`

  const currentFontFamily = opts.fontFamily || ''
  const currentFontSize = opts.fontSize ?? 14
  const currentFontWeight = opts.fontWeight || 'normal'
  const currentLetterSpacing = opts.letterSpacing ?? ''
  const currentColor = opts.color || '#000000'
  const currentBgColor = opts.backgroundColor || '#ffffff'
  const currentTextDecoration = opts.textDecoration || ''
  const currentTextAlign = opts.textAlign || ''
  const currentVAlign = opts.textContentVerticalAlign || ''
  const currentTextWrap = opts.textContentWrap || ''
  const currentLineHeight = opts.lineHeight ?? ''
  const currentRotate = opts.transform ?? ''

  const contentVNode = h('div', { class: 'text-style-modal' }, [
    // 第 1 行：字體 / 字型大小 / 字體粗細 / 字間距
    h('div', { class: 'text-style-row' }, [
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '字體'),
        h(
          'select',
          {
            id: idFontFamily,
            class: 'field-control'
          },
          [
            h('option', { value: '', selected: !currentFontFamily }, '預設'),
            ...hiprintFontList.map((f) =>
              h('option', { value: f.value, selected: currentFontFamily === f.value }, f.title)
            )
          ]
        )
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '字型大小(pt)'),
        h('input', {
          id: idFontSize,
          type: 'number',
          value: currentFontSize,
          class: 'field-control'
        })
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '字體粗細'),
        h(
          'select',
          {
            id: idFontWeight,
            class: 'field-control'
          },
          [
            h('option', { value: 'normal', selected: !currentFontWeight || currentFontWeight === '400' || currentFontWeight === 'normal' }, '預設'),
            h('option', { value: 'bold', selected: currentFontWeight === 'bold' || currentFontWeight === '600' || currentFontWeight === '700' }, '粗體')
          ]
        )
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '字間距(pt)'),
        h('input', {
          id: idLetterSpacing,
          type: 'number',
          value: currentLetterSpacing,
          class: 'field-control'
        })
      ])
    ]),

    // 第 2 行：字體顏色 / 背景顏色 / 文本修飾 / 左右對齊
    h('div', { class: 'text-style-row' }, [
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '字體顏色'),
        h('input', {
          id: idColor,
          type: 'color',
          value: currentColor,
          class: 'field-control color-input'
        })
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '背景顏色'),
        h('input', {
          id: idBgColor,
          type: 'color',
          value: currentBgColor,
          class: 'field-control color-input'
        })
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '文本修飾'),
        h(
          'select',
          {
            id: idTextDecoration,
            class: 'field-control'
          },
          [
            h('option', { value: '', selected: !currentTextDecoration }, '預設'),
            h('option', { value: 'underline', selected: currentTextDecoration === 'underline' }, '底線'),
            h('option', { value: 'line-through', selected: currentTextDecoration === 'line-through' }, '刪除線')
          ]
        )
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '左右對齊'),
        h(
          'select',
          {
            id: idTextAlign,
            class: 'field-control'
          },
          [
            h('option', { value: '', selected: !currentTextAlign }, '預設'),
            h('option', { value: 'left', selected: currentTextAlign === 'left' }, '靠左'),
            h('option', { value: 'center', selected: currentTextAlign === 'center' }, '置中'),
            h('option', { value: 'right', selected: currentTextAlign === 'right' }, '靠右'),
            h('option', { value: 'justify', selected: currentTextAlign === 'justify' }, '左右分散')
          ]
        )
      ])
    ]),

    // 第 3 行：上下對齊 / 文本換行 / 字體行高 / 旋轉角度
    h('div', { class: 'text-style-row' }, [
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '上下對齊'),
        h(
          'select',
          {
            id: idVAlign,
            class: 'field-control'
          },
          [
            h('option', { value: '', selected: !currentVAlign }, '預設'),
            h('option', { value: 'middle', selected: currentVAlign === 'middle' }, '垂直置中'),
            h('option', { value: 'bottom', selected: currentVAlign === 'bottom' }, '底部')
          ]
        )
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '文本換行'),
        h(
          'select',
          {
            id: idTextWrap,
            class: 'field-control'
          },
          [
            h('option', { value: '', selected: !currentTextWrap }, '預設'),
            h('option', { value: 'nowrap', selected: currentTextWrap === 'nowrap' }, '不換行'),
            h('option', { value: 'clip', selected: currentTextWrap === 'clip' }, '不換行&隱藏'),
            h('option', { value: 'ellipsis', selected: currentTextWrap === 'ellipsis' }, '不換行&省略')
          ]
        )
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '字體行高(pt)'),
        h('input', {
          id: idLineHeight,
          type: 'number',
          value: currentLineHeight,
          class: 'field-control'
        })
      ]),
      h('div', { class: 'text-style-field' }, [
        h('span', { class: 'field-label' }, '旋轉角度(°)'),
        h('input', {
          id: idRotate,
          type: 'number',
          value: currentRotate,
          class: 'field-control'
        })
      ])
    ])
  ])

  const applyChanges = () => {
    const getInputValue = (id, fallback) => {
      const el = document.getElementById(id)
      if (!el) return fallback
      return el.value || fallback
    }

    const getNumber = (id, fallback) => {
      const el = document.getElementById(id)
      if (!el) return fallback
      const v = parseFloat(el.value)
      return Number.isNaN(v) ? fallback : v
    }

    const nextFontFamily = getInputValue(idFontFamily, currentFontFamily)
    const nextFontSize = getNumber(idFontSize, currentFontSize)
    const nextFontWeight = getInputValue(idFontWeight, currentFontWeight)
    const nextLetterSpacing = getNumber(idLetterSpacing, currentLetterSpacing)
    const nextColor = getInputValue(idColor, currentColor)
    const nextBgColor = getInputValue(idBgColor, currentBgColor)
    const nextTextDecoration = getInputValue(idTextDecoration, currentTextDecoration)
    const nextTextAlign = getInputValue(idTextAlign, currentTextAlign)
    const nextVAlign = getInputValue(idVAlign, currentVAlign)
    const nextTextWrap = getInputValue(idTextWrap, currentTextWrap)
    const nextLineHeight = getNumber(idLineHeight, currentLineHeight)
    const nextRotate = getNumber(idRotate, currentRotate)

    opts.fontFamily = nextFontFamily
    opts.fontSize = nextFontSize
    opts.fontWeight = nextFontWeight
    opts.letterSpacing = nextLetterSpacing
    opts.color = nextColor
    opts.backgroundColor = nextBgColor
    opts.textDecoration = nextTextDecoration
    opts.textAlign = nextTextAlign
    opts.textContentVerticalAlign = nextVAlign
    opts.textContentWrap = nextTextWrap
    opts.lineHeight = nextLineHeight
    opts.transform = nextRotate

    try {
      if (typeof designElement.updateDesignViewFromOptions === 'function') {
        designElement.updateDesignViewFromOptions()
      }
    } catch (e) {
      // ignore
    }

    message.success('已更新文字樣式')
  }

  Modal.confirm({
    title: '文字樣式',
    icon: null,
    content: contentVNode,
    width: 720,
    okText: '套用',
    cancelText: '取消',
    maskClosable: true,
    closable: true,
    onOk() {
      applyChanges()
    }
  })
}

const openBorderStyleModal = (designElement) => {
  const opts = designElement.options
  if (!opts) return

  const modalIdBase = `hiprint-border-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const idBorderLeft = `${modalIdBase}-borderLeft`
  const idBorderTop = `${modalIdBase}-borderTop`
  const idBorderRight = `${modalIdBase}-borderRight`
  const idBorderBottom = `${modalIdBase}-borderBottom`
  const idBorderWidth = `${modalIdBase}-borderWidth`
  const idBorderColor = `${modalIdBase}-borderColor`
  const idPaddingLeft = `${modalIdBase}-paddingLeft`
  const idPaddingTop = `${modalIdBase}-paddingTop`
  const idPaddingRight = `${modalIdBase}-paddingRight`
  const idPaddingBottom = `${modalIdBase}-paddingBottom`

  const currentBorderLeft = opts.borderLeft || ''
  const currentBorderTop = opts.borderTop || ''
  const currentBorderRight = opts.borderRight || ''
  const currentBorderBottom = opts.borderBottom || ''
  const currentBorderWidth = opts.borderWidth ?? 0.75  //框線
  const currentBorderColor = opts.borderColor || '#000000'
  const currentPaddingLeft = opts.contentPaddingLeft ?? 2
  const currentPaddingTop = opts.contentPaddingTop ?? 2
  const currentPaddingRight = opts.contentPaddingRight ?? 2
  const currentPaddingBottom = opts.contentPaddingBottom ?? 2

  const createBorderSelect = (id, currentValue) =>
    h(
      'select',
      {
        id,
        class: 'field-control'
      },
      [
        h('option', { value: '', selected: !currentValue }, '否'),
        h('option', { value: 'solid', selected: currentValue === 'solid' }, '實線'),
        h('option', { value: 'dotted', selected: currentValue === 'dotted' }, '虛線')
      ]
    )

  const contentVNode = h('div', { class: 'border-style-modal' }, [
    // 第 1 行：左邊框 / 上邊框
    h('div', { class: 'border-style-row' }, [
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '左邊框'),
        createBorderSelect(idBorderLeft, currentBorderLeft)
      ]),
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '上邊框'),
        createBorderSelect(idBorderTop, currentBorderTop)
      ])
    ]),

    // 第 2 行：右邊框 / 下邊框
    h('div', { class: 'border-style-row' }, [
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '右邊框'),
        createBorderSelect(idBorderRight, currentBorderRight)
      ]),
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '下邊框'),
        createBorderSelect(idBorderBottom, currentBorderBottom)
      ])
    ]),

    // 第 3 行：邊框大小 / 邊框顏色
    h('div', { class: 'border-style-row' }, [
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '邊框大小(pt)'),
        h('input', {
          id: idBorderWidth,
          type: 'number',
          value: currentBorderWidth,
          class: 'field-control'
        })
      ]),
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '邊框顏色'),
        h('input', {
          id: idBorderColor,
          type: 'color',
          value: currentBorderColor,
          class: 'field-control color-input'
        })
      ])
    ]),

    // 第 4 行：左內邊距 / 上內邊距
    h('div', { class: 'border-style-row' }, [
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '左內邊距(pt)'),
        h('input', {
          id: idPaddingLeft,
          type: 'number',
          value: currentPaddingLeft,
          class: 'field-control'
        })
      ]),
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '上內邊距(pt)'),
        h('input', {
          id: idPaddingTop,
          type: 'number',
          value: currentPaddingTop,
          class: 'field-control'
        })
      ])
    ]),

    // 第 5 行：右內邊距 / 下內邊距
    h('div', { class: 'border-style-row' }, [
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '右內邊距(pt)'),
        h('input', {
          id: idPaddingRight,
          type: 'number',
          value: currentPaddingRight,
          class: 'field-control'
        })
      ]),
      h('div', { class: 'border-style-field' }, [
        h('span', { class: 'field-label' }, '下內邊距(pt)'),
        h('input', {
          id: idPaddingBottom,
          type: 'number',
          value: currentPaddingBottom,
          class: 'field-control'
        })
      ])
    ])
  ])

  const getInputValue = (id, fallback) => {
    const el = document.getElementById(id)
    if (!el) return fallback
    return el.value || fallback
  }

  const getNumber = (id, fallback) => {
    const root = document.getElementById(id)
    if (!root) return fallback
    let el = root
    if (el.tagName !== 'INPUT') {
      el = root.querySelector('input')
      if (!el) return fallback
    }
    const v = parseFloat(el.value)
    return Number.isNaN(v) ? fallback : v
  }

  const applyChanges = () => {
    const nextBorderLeft = getInputValue(idBorderLeft, currentBorderLeft)
    const nextBorderTop = getInputValue(idBorderTop, currentBorderTop)
    const nextBorderRight = getInputValue(idBorderRight, currentBorderRight)
    const nextBorderBottom = getInputValue(idBorderBottom, currentBorderBottom)
    const nextBorderWidth = getNumber(idBorderWidth, currentBorderWidth)
    const nextBorderColor = getInputValue(idBorderColor, currentBorderColor)
    const nextPaddingLeft = getNumber(idPaddingLeft, currentPaddingLeft)
    const nextPaddingTop = getNumber(idPaddingTop, currentPaddingTop)
    const nextPaddingRight = getNumber(idPaddingRight, currentPaddingRight)
    const nextPaddingBottom = getNumber(idPaddingBottom, currentPaddingBottom)

    opts.borderLeft = nextBorderLeft
    opts.borderTop = nextBorderTop
    opts.borderRight = nextBorderRight
    opts.borderBottom = nextBorderBottom
    opts.borderWidth = nextBorderWidth
    opts.borderColor = nextBorderColor
    opts.contentPaddingLeft = nextPaddingLeft
    opts.contentPaddingTop = nextPaddingTop
    opts.contentPaddingRight = nextPaddingRight
    opts.contentPaddingBottom = nextPaddingBottom

    try {
      if (typeof designElement.updateDesignViewFromOptions === 'function') {
        designElement.updateDesignViewFromOptions()
      }
    } catch (e) {
      // ignore
    }

    message.success('已更新邊框設定')
  }

  Modal.confirm({
    title: '邊框設定',
    icon: null,
    content: contentVNode,
    width: 560,
    okText: '套用',
    cancelText: '取消',
    maskClosable: true,
    closable: true,
    onOk() {
      applyChanges()
    }
  })
}

const isTextLikeElement = (designElement) => {
  const type = designElement?.printElementType?.type
  if (!type) return false
  return String(type).toLowerCase().includes('text')
}

const showElementContextMenu = (event, designElement, $target) => {
  // debug: 確認右鍵是否有觸發，以及是否為文字類元素
  console.log('[DesignerView] showElementContextMenu', {
    type: designElement?.printElementType?.type,
    isTextLike: isTextLikeElement(designElement)
  })

  let $menu = $('.hiprint-vue-contextmenu')
  if (!$menu.length) {
    $menu = $('<ul class="hiprint-vue-contextmenu"></ul>').appendTo('body')
  }

  const hideMenu = () => {
    $menu.hide()
    $menu.find('.hiprint-vue-contextmenu-item').off('click')
    $(document).off('click.hiprint-vue-contextmenu')
  }

  const addItem = (label, onClick) => {
    const $item = $('<li class="hiprint-vue-contextmenu-item"></li>').text(label)
    $item.on('click', (e) => {
      e.stopPropagation()
      hideMenu()
      onClick()
    })
    $menu.append($item)
  }

  $menu.empty()

  addItem('編輯位置與大小…', () => {
    openLockPositionModal(designElement, $target)
  })

  if (isTextLikeElement(designElement)) {
    addItem('文字樣式…', () => {
      openTextStyleModal(designElement)
    })
  }

  addItem('邊框設定…', () => {
    openBorderStyleModal(designElement)
  })

  $menu.css({
    position: 'fixed',
    top: event.clientY,
    left: event.clientX,
    zIndex: 9999,
    minWidth: '140px',
    padding: '4px 0',
    margin: 0,
    listStyle: 'none',
    background: '#fff',
    border: '1px solid #d9d9d9',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    borderRadius: '2px',
    display: 'block'
  })

  $(document)
    .off('click.hiprint-vue-contextmenu')
    .on('click.hiprint-vue-contextmenu', () => {
      hideMenu()
    })
}

const attachLockContextMenu = () => {
  const $root = $('#hiprint-printTemplate')
  $root.off('contextmenu.hiprint-lock').on('contextmenu.hiprint-lock', (event) => {
    const $target = $(event.target).closest('.hiprint-printElement')
    console.log('[DesignerView] contextmenu on template', {
      hasTarget: !!$target.length,
      rawTargetClass: event.target && event.target.className
    })
    if (!$target.length) return

    const dragData =
      $target.data('hidraggable') ||
      $target.find('.resize-panel').data('hidraggable')

    const designElement = dragData?.options?.designTarget
    if (!designElement || !designElement.options) return

    // 避免與 hiprint 內建表格右鍵選單衝突：表格元素直接交給原生功能處理
    if (designElement.printElementType && designElement.printElementType.type === 'table') {
      return
    }

    event.preventDefault()
    showElementContextMenu(event, designElement, $target)
  })
}

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
    dataMode: 1,
    onDataChanged: (type, json) => {
      handleTemplateDataChanged(type, json)
    }
  })

  hiprintTemplate.design('#hiprint-printTemplate', { grid: true })
  attachLockContextMenu()
  hiprintTemplate.zoom(DISPLAY_BASE_SCALE)
  state.scaleValue = 1
  lastCommittedTemplateJson = hiprintTemplate.getJson()
  lastCommittedTemplateStr = lastCommittedTemplateJson ? JSON.stringify(lastCommittedTemplateJson) : ''
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
  $('#hiprint-printTemplate').off('contextmenu.hiprint-lock')
  $('.hiprint-vue-contextmenu').remove()
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

:deep(.lock-position-modal) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:deep(.lock-position-row) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: nowrap;
  gap: 8px;
}

:deep(.lock-field-group) {
  display: flex;
  align-items: center;
}

:deep(.lock-icon-group) {
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.lock-icon) {
  font-size: 16px;
  color: #bfbfbf;
}

:deep(.lock-icon.locked) {
  color: #faad14;
}

:deep(.lock-icon.unlocked) {
  color: #52c41a;
}

:deep(.lock-position-row .label) {
  display: inline-block;
  width: 28px;
  text-align: right;
  color: #555;
}

:deep(.group-label) {
  display: inline-block;
  width: 72px;
  text-align: left;
  font-size: 13px;
  color: #555;
}

:deep(.lock-position-row .unit) {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}

:deep(.lock-tip) {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.setting-container-wrapper {
  position: relative;
  min-height: 70vh;
}

.setting-container {
  min-height: 100%;
}

.setting-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: #999;
  font-size: 13px;
  text-align: center;
}

.setting-container:not(:empty) + .setting-placeholder {
  display: none;
}

:deep(.hiprint-printElement .resize-panel.selected) {
  border: 1px solid #1890ff;
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.35);
  background-color: rgba(24, 144, 255, 0.08) !important;
  position: relative;
}

/* 鎖定中的元素：選取外框改成橘色，與一般藍色選取區分 */
:deep(.hiprint-printElement .resize-panel.selected.locked) {
  border-color: #faad14;
  box-shadow: 0 0 0 1px rgba(250, 173, 20, 0.45);
  background-color: rgba(250, 173, 20, 0.06) !important;
}

/* 鎖定標記：出現在選取外框左上角的小鎖頭徽章 */
:deep(.hiprint-printElement .resize-panel .hiprint-lock-badge) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  font-size: 13px;
  line-height: 18px;
  text-align: center;
  background-color: #fff;
  border-radius: 50%;
  border: 1px solid #d9d9d9;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
  pointer-events: none;
}

/* 紙張上的頁眉 / 頁尾參考線（上下約 2cm）改成紅色虛線，方便對齊邊界 */
:deep(.hiprint-printPaper.design .hiprint-headerLine),
:deep(.hiprint-printPaper.design .hiprint-footerLine) {
  border-top: 1px dashed rgb(241, 110, 110) !important;
}

.mt-2 {
  margin-top: 8px;
}

.mt-3 {
  margin-top: 16px;
}
</style>

<style>
.hiprint-vue-contextmenu {
  position: absolute;
  z-index: 9999;
  min-width: 140px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: #fff;
  border: 1px solid #d9d9d9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 2px;
  font-size: 13px;
}

.hiprint-vue-contextmenu-item {
  padding: 6px 16px;
  cursor: pointer;
  white-space: nowrap;
  display: block;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.85);
  background-color: #ffffff;
}

.hiprint-vue-contextmenu-item + .hiprint-vue-contextmenu-item {
  border-top: 1px solid #f0f0f0;
}

.hiprint-vue-contextmenu-item:hover {
  background-color: #e6f7ff;
  color: #1890ff;
}

.lock-position-modal {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lock-position-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lock-position-row .group-label {
  display: inline-block;
  width: 72px;
  text-align: left;
  font-size: 13px;
  color: #555;
}

.lock-position-row .lock-field-group {
  display: inline-flex;
  align-items: center;
}

.lock-position-row .lock-field-group input[type='number'] {
  width: 90px;
  text-align: right;
}

.lock-position-row .lock-icon-group {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-position-row .lock-icon {
  font-size: 14px;
}

/* 文字樣式彈窗：三欄一排的排版（全域套用到 AntD Modal 內容） */
.text-style-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 16px;
}

.text-style-row {
  display: flex;
  gap: 4px;
}

.text-style-field {
  flex: 0 0 25%;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 邊框設定彈窗：兩欄一排的排版 */
.border-style-modal {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.border-style-row {
  display: flex;
  gap: 2px;
}

.border-style-field {
  flex: 0 0 50%;
  display: flex;
  align-items: center;
  gap: 6px;
}

.text-style-field .field-label,
.border-style-field .field-label {
  flex: 0 0 55px;
  text-align: left;
  font-size: 13px;
  color: #555;
}

.text-style-field .field-control,
.border-style-field .field-control {
  flex: 0 0 80px;
  max-width: 80px;
  height: 32px;
  padding: 4px 5px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  box-sizing: border-box;
}

/* 強制讓數字輸入框文字靠左，避免瀏覽器或 AntD 把 number 預設設成靠右 */
.text-style-field .field-control[type='number'],
.border-style-field .field-control[type='number'] {
  text-align: right !important;
}

.text-style-field .field-control:focus,
.border-style-field .field-control:focus {
  border-color: #40a9ff;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.text-style-field .unit,
.border-style-field .unit {
  margin-left: 4px;
  font-size: 12px;
  color: #999;
}

.text-style-field .color-input,
.border-style-field .color-input {
  padding: 0;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  height: 32px;
}
</style>
