import { useChatStore } from '@/stores/chat'

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

      const apiMessages: Array<{ role: string, content: string }> = []

      if (config.systemPrompt.trim()) {
        apiMessages.push({ role: 'system', content: config.systemPrompt.trim() })
      }

      for (const msg of messages) {
        if (msg.id === assistantMsg.id) break
        apiMessages.push({ role: msg.role, content: msg.content })
      }

      const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: apiMessages,
          stream: true,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
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
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              accumulated += delta
              chatStore.updateMessage(assistantMsg.id, accumulated)
            }
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      chatStore.updateMessage(assistantMsg.id, `[Error] ${errorMessage}`)
    } finally {
      chatStore.isLoading = false
      chatStore.isStreaming = false
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
