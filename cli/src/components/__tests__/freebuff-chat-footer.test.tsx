import { beforeAll, expect, test } from 'bun:test'
import { createTestRenderer } from '@opentui/core/testing'
import { createRoot, flushSync } from '@opentui/react'
// FORK (MethaTech): the footer reads the display name through the panel
// directory, so this test uses the panel id 'glm-5.3-flash' (same display
// name 'GLM 5.3 Flash'). The old Freebuff wire id 'z-ai/glm-5.3-flash' is
// not a panel model and the footer shows it raw.
const GLM_V53_FLASH_MODEL_ID = 'glm-5.3-flash'
import { FreebuffChatFooter } from '../freebuff-chat-footer'
import { initializeThemeStore } from '../../hooks/use-theme'
import { useChatStore } from '../../state/chat-store'
import { useFreebuffModelStore } from '../../state/freebuff-model-store'
import { useFreebuffChatStore } from '../../state/freebuff-chat-store'

beforeAll(initializeThemeStore)

test.each([120, 42])(
  'footer reflects model, reasoning and chat name at %s columns',
  async (width) => {
    const previousModel = useFreebuffModelStore.getState()
    const previousNext = useFreebuffChatStore.getState().nextModel
    const previousMessages = useChatStore.getState().messages
    const setup = await createTestRenderer({ width, height: 5 })
    const root = createRoot(setup.renderer)
    try {
      useFreebuffModelStore.setState({
        selectedModel: GLM_V53_FLASH_MODEL_ID,
        reasoningEffortByModel: {},
      })
      useFreebuffChatStore.setState({ nextModel: null })
      useChatStore.setState({ messages: [] })
      flushSync(() =>
        root.render(<FreebuffChatFooter projectRoot="/tmp/project" />),
      )
      await setup.renderOnce()
      expect(setup.captureCharFrame().replace(/\s+/g, ' ')).toContain('Chat: New chat')
      flushSync(() => {
        useFreebuffModelStore.setState({
          reasoningEffortByModel: { [GLM_V53_FLASH_MODEL_ID]: 'low' },
        })
        useChatStore.setState({
          messages: [
            {
              id: 'first',
              variant: 'user',
              content: 'Build a game',
              timestamp: new Date().toISOString(),
            },
          ],
        })
      })
      await setup.renderOnce()
      const frame = setup.captureCharFrame().replace(/\s+/g, ' ')
      // FORK (MethaTech): panel models carry no reasoning-effort ladder, so
      // the footer shows the model name with no "• low" suffix even when an
      // effort was saved for the row.
      expect(frame).toContain('GLM 5.3 Flash')
      expect(frame).not.toContain('• low')
      expect(frame).toContain('/tmp/project')
      expect(frame).toContain('Chat: Build a game')
    } finally {
      flushSync(() => root.unmount())
      setup.renderer.destroy()
      useFreebuffModelStore.setState(previousModel)
      useFreebuffChatStore.setState({ nextModel: previousNext })
      useChatStore.setState({ messages: previousMessages })
    }
  },
)
