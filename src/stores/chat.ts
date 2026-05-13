import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export type ChatProtocol = 'openai' | 'anthropic'

export interface ChatConfig {
  apiKey: string
  apiEndpoint: string
  model: string
  protocol: ChatProtocol
  enabled: boolean
}

export const useChatStore = defineStore('chat', () => {
  const config = reactive<ChatConfig>({
    apiKey: '',
    apiEndpoint: '',
    model: '',
    protocol: 'openai',
    enabled: true,
  })

  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)

  function addMessage(role: ChatMessage['role'], content: string) {
    const message: ChatMessage = {
      id: nanoid(),
      role,
      content,
      timestamp: Date.now(),
    }
    messages.value.push(message)
    return message
  }

  function updateMessage(id: string, content: string) {
    const msg = messages.value.find(m => m.id === id)
    if (msg) {
      msg.content = content
    }
  }

  function clearHistory() {
    messages.value = []
  }

  return {
    config,
    messages,
    isLoading,
    isStreaming,
    addMessage,
    updateMessage,
    clearHistory,
  }
}, {
  tauri: {
    filterKeys: ['messages', 'isLoading', 'isStreaming'],
  },
})
