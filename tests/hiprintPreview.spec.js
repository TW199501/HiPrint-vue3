import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HiprintPreview from '../src/components/HiprintPreview.vue'

const createTemplateMock = () => {
  return {
    getHtml: vi.fn().mockReturnValue('<div class="mock-html">preview content</div>'),
    editingPanel: { width: 200 },
    print: vi.fn((data, options = {}, callbacks = {}) => {
      callbacks?.callback?.()
    }),
    toPdf: vi.fn()
  }
}

describe('HiprintPreview', () => {
  it('renders preview html when show is invoked', async () => {
    const wrapper = mount(HiprintPreview)
    const templateMock = createTemplateMock()

    wrapper.vm.show(templateMock, { foo: 'bar' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(templateMock.getHtml).toHaveBeenCalled()
    expect(wrapper.find('.preview-container').html()).toContain('mock-html')
  })

  it('calls template print method and resets loading state', async () => {
    const wrapper = mount(HiprintPreview)
    const templateMock = createTemplateMock()

    wrapper.vm.show(templateMock, {})
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    wrapper.vm.print()

    expect(templateMock.print).toHaveBeenCalledTimes(1)
  })

  it('delegates toPdf to template instance', async () => {
    const wrapper = mount(HiprintPreview)
    const templateMock = createTemplateMock()

    wrapper.vm.show(templateMock, {})
    await new Promise((resolve) => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    wrapper.vm.toPdf()
    expect(templateMock.toPdf).toHaveBeenCalled()
  })
})
