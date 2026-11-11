import { describe, expect, test } from 'bun:test'

describe('freebuff command aliases', () => {
  test.each(['true', 'false'])('model, reasoning and ads commands respect FREEBUFF_MODE=%s', (freebuffMode) => {
    const slashCommandsUrl = new URL(
      '../../data/slash-commands.ts',
      import.meta.url,
    ).href
    const commandRegistryUrl = new URL(
      '../command-registry.ts',
      import.meta.url,
    ).href

    const result = Bun.spawnSync({
      cmd: [
        'bun',
        '--eval',
        `
          import { SLASH_COMMANDS } from ${JSON.stringify(slashCommandsUrl)}
          import { findCommand } from ${JSON.stringify(commandRegistryUrl)}
          import { useFreebuffChatStore, openFreebuffModelPicker } from ${JSON.stringify(new URL('../../state/freebuff-chat-store.ts', import.meta.url).href)}
          import { useFreebuffModelStore } from ${JSON.stringify(new URL('../../state/freebuff-model-store.ts', import.meta.url).href)}
          import { useFreebuffSessionStore } from ${JSON.stringify(new URL('../../state/freebuff-session-store.ts', import.meta.url).href)}
          import { getFreebuffModelDirectory } from ${JSON.stringify(new URL('../../state/freebuff-catalog-store.ts', import.meta.url).href)}
          import assert from 'node:assert/strict'

          // These write adsEnabled to the settings file MethaTech shares
          // (~/.config/metatech). Freebuff always shows ads, so it must not
          // offer a switch it ignores and MethaTech would honour.
          for (const name of ['ads:enable', 'ads:disable']) {
            const isFree = process.env.FREEBUFF_MODE === 'true'
            assert.equal(findCommand(name) === undefined, isFree)
            assert.equal(SLASH_COMMANDS.some(cmd => cmd.id === name), !isFree)
          }

          if (process.env.FREEBUFF_MODE !== 'true') {
            for (const name of ['reasoning', 'effort', 'think']) {
              assert.equal(findCommand(name), undefined)
              assert.equal(SLASH_COMMANDS.some(cmd => cmd.id === name || cmd.aliases?.includes(name)), false)
            }
            process.exit(0)
          }

          const endSession = SLASH_COMMANDS.find((cmd) => cmd.id === 'end-session')
          if (!endSession) throw new Error('end-session slash command missing')
          if (endSession.aliases?.includes('model')) {
            throw new Error('model must not end the session')
          }

          const modelCommand = findCommand('model')
          if (!modelCommand) throw new Error('model command alias missing')
          if (modelCommand.name !== 'model') {
            throw new Error('model must resolve to its own command')
          }

          const model = 'z-ai/glm-5.3-flash'
          const activeModel = 'mimo/mimo-v2.5'
          useFreebuffModelStore.setState({ selectedModel: activeModel })
          useFreebuffChatStore.setState({ nextModel: model })
          const directory = getFreebuffModelDirectory()
          const effortsBefore = useFreebuffModelStore.getState().reasoningEffortByModel
          const sessionBefore = useFreebuffSessionStore.getState().session
          let messages = []
          let history = []
          let input
          const params = {
            inputValue: '/reasoning',
            saveToHistory: value => history.push(value),
            setInputValue: value => { input = value },
            setMessages: update => { messages = update(messages) },
            sendMessage: () => { throw new Error('must not send a prompt') },
          }
          const menu = SLASH_COMMANDS.find(cmd => cmd.id === 'reasoning')
          assert.ok(menu)
          assert.deepEqual(menu.aliases, ['effort', 'think'])
          // FORK (MethaTech): no panel model offers adjustable reasoning
          // (the MethaTech directory declares no effort ladder), so the
          // reasoning command reports that and never opens the picker —
          // for every alias, and for the model and the next-model alike.
          for (const name of ['reasoning', 'effort', 'think']) {
            useFreebuffChatStore.setState({ pickerOpen: false, pickerInitialView: 'model' })
            const command = findCommand(name)
            assert.equal(command?.name, 'reasoning')
            await command.handler(params, '')
            assert.equal(useFreebuffChatStore.getState().pickerOpen, false)
            assert.equal(useFreebuffChatStore.getState().pickerInitialView, 'model')
            assert.equal(useFreebuffChatStore.getState().nextModel, model)
            assert.equal(useFreebuffChatStore.getState().admission, null)
            assert.equal(useFreebuffModelStore.getState().selectedModel, activeModel)
            assert.equal(useFreebuffModelStore.getState().reasoningEffortByModel, effortsBefore)
            assert.equal(useFreebuffSessionStore.getState().session, sessionBefore)
          }
          assert.equal(messages.length, 3)
          assert.ok(JSON.stringify(messages).includes('does not offer adjustable reasoning'))
          assert.equal(history.length, 3)
          assert.equal(input.text, '')

          openFreebuffModelPicker()
          assert.equal(useFreebuffChatStore.getState().pickerInitialView, 'model')
          useFreebuffChatStore.setState({ pickerOpen: false, admission: { phase: 'starting', model } })
          await findCommand('reasoning').handler(params, '')
          assert.equal(useFreebuffChatStore.getState().pickerOpen, false)

          const fixedModel = directory.pickerModels('full', true).find(row => !directory.efforts(row.id)?.length)
          assert.ok(fixedModel, 'fixture needs a model without an effort ladder')
          useFreebuffChatStore.setState({ admission: null, nextModel: fixedModel.id })
          await findCommand('reasoning').handler(params, '')
          assert.equal(useFreebuffChatStore.getState().pickerOpen, false)
          assert.ok(JSON.stringify(messages).includes('does not offer adjustable reasoning'))
        `,
      ],
      cwd: process.cwd(),
      env: {
        ...process.env,
        FREEBUFF_MODE: freebuffMode,
        NODE_ENV: 'test',
        NEXT_PUBLIC_CB_ENVIRONMENT: 'test',
        NEXT_PUBLIC_METHATECH_APP_URL: 'https://app.methatech.test',
        NEXT_PUBLIC_SUPPORT_EMAIL: 'support@methatech.test',
        NEXT_PUBLIC_POSTHOG_API_KEY: 'phc_test_key',
        NEXT_PUBLIC_POSTHOG_HOST_URL: 'https://posthog.methatech.test',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL: 'https://stripe.methatech.test',
        NEXT_PUBLIC_WEB_PORT: '3000',
      },
      stderr: 'pipe',
      stdout: 'pipe',
    })

    const stderr = new TextDecoder().decode(result.stderr)
    expect(result.exitCode, stderr).toBe(0)
  }, 15_000)
})
