import { useChatStore } from '@/stores/chat'
import { buildSystemPrompt } from './useSkillRouter'

export function useChat() {
  const chatStore = useChatStore()

  async function sendMessage(content: string) {
    if (!content.trim() || chatStore.isLoading) return

    chatStore.addMessage('user', content.trim())
    chatStore.isLoading = true
    chatStore.isStreaming = true

    const assistantMsg = chatStore.addMessage('assistant', '')

    try {
      const { config, messages } = chatStore

      const apiUrl = config.apiEndpoint || import.meta.env.VITE_AI_API_URL || '/api/ai'
      const apiKey = config.apiKey || import.meta.env.VITE_AI_API_KEY
      const model = config.model || import.meta.env.VITE_AI_MODEL
      const protocol = config.protocol || 'openai'

      const apiMessages: Array<{ role: string, content: string }> = []

      for (const msg of messages) {
        if (msg.id === assistantMsg.id) break
        apiMessages.push({ role: msg.role, content: msg.content })
      }

      const systemPrompt = await buildSystemPrompt(content, apiUrl, apiKey, model, protocol)

      if (protocol === 'anthropic') {
        await sendAnthropic(apiUrl, apiKey, model, apiMessages, assistantMsg.id, systemPrompt)
      } else {
        await sendOpenAI(apiUrl, apiKey, model, apiMessages, assistantMsg.id, systemPrompt)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      chatStore.updateMessage(assistantMsg.id, `[Error] ${errorMessage}`)
    } finally {
      chatStore.isLoading = false
      chatStore.isStreaming = false
    }
  }

  async function sendOpenAI(
    apiUrl: string,
    apiKey: string,
    model: string,
    messages: Array<{ role: string, content: string }>,
    msgId: string,
    systemPrompt: string,
  ) {
    const apiMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error ${response.status}: ${errorText}`)
    }

    await readSSE(response, (delta) => {
      chatStore.updateMessage(msgId, delta)
    })
  }

  async function sendAnthropic(
    apiUrl: string,
    apiKey: string,
    model: string,
    messages: Array<{ role: string, content: string }>,
    msgId: string,
    systemPrompt: string,
  ) {
    const anthropicMessages = messages.map(msg => ({
      role: msg.role,
      content: [{ type: 'text', text: msg.content }],
    }))

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: anthropicMessages,
      stream: true,
    }
    if (systemPrompt) body.system = systemPrompt

    const response = await fetch(`${apiUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error ${response.status}: ${errorText}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()!

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            accumulated += parsed.delta.text
            chatStore.updateMessage(msgId, accumulated)
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  async function readSSE(
    response: Response,
    onUpdate: (accumulated: string) => void,
  ) {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()!

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            accumulated += delta
            onUpdate(accumulated)
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  function clearHistory() {
    chatStore.clearHistory()
  }

  return {
    sendMessage,
    clearHistory,
  }
}
