<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { nextTick, ref, watch } from 'vue'

import { useChat } from '@/composables/useChat'
import { WINDOW_LABEL } from '@/constants'
import { hideWindow, showWindow } from '@/plugins/window'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const { sendMessage } = useChat()
const appWindow = getCurrentWebviewWindow()

const inputText = ref('')
const messagesRef = ref<HTMLDivElement>()

async function handleSend() {
  if (!inputText.value.trim()) return

  const content = inputText.value
  inputText.value = ''
  await sendMessage(content)
  scrollToBottom()
}

async function handleClose() {
  await hideWindow(WINDOW_LABEL.CHAT)
  showWindow(WINDOW_LABEL.CHAT_TRIGGER)
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

watch(() => chatStore.messages.length, scrollToBottom)
watch(() => chatStore.isStreaming, (streaming) => {
  if (streaming) scrollToBottom()
})
</script>

<template>
  <div
    class="chat-window"
    @mousedown="appWindow.startDragging()"
  >
    <div class="chat-header">
      <span class="font-medium text-sm">AI Chat</span>
      <div
        class="i-solar:close-circle-bold cursor-pointer text-4.5 text-gray-400 hover:text-gray-600"
        @click.stop="handleClose"
        @mousedown.stop
      />
    </div>

    <div
      ref="messagesRef"
      class="chat-messages"
    >
      <div
        v-if="chatStore.messages.length === 0"
        class="h-full flex items-center justify-center text-gray-400 text-sm"
      >
        Say something to get started...
      </div>

      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        class="chat-message"
        :class="[msg.role]"
      >
        <div class="chat-message-content">
          {{ msg.content }}
        </div>
      </div>

      <div
        v-if="chatStore.isStreaming && chatStore.messages.length > 0 && chatStore.messages[chatStore.messages.length - 1].role !== 'assistant'"
        class="chat-message assistant"
      >
        <div class="chat-message-content typing-indicator">
          <span /><span /><span />
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <input
        v-model="inputText"
        class="chat-input"
        :disabled="chatStore.isLoading"
        placeholder="Type a message..."
        @keydown.enter.prevent="handleSend"
        @mousedown.stop
      >
      <div
        class="chat-send-btn"
        :class="{ active: inputText.trim() && !chatStore.isLoading }"
        @click.stop="handleSend"
        @mousedown.stop
      >
        <div class="i-solar:round-arrow-right-bold text-4" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-window {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

:root.dark .chat-window {
  background: #1a1a2e;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  -webkit-app-region: drag;
}

:root.dark .chat-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}

:root.dark .chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

.chat-message {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.chat-message.user {
  align-self: flex-end;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-message.assistant {
  align-self: flex-start;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.85);
  border-bottom-left-radius: 4px;
}

:root.dark .chat-message.assistant {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.chat-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

:root.dark .chat-input-area {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.chat-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 8px 12px;
  color: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

:root.dark .chat-input {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.chat-input::placeholder {
  color: rgba(0, 0, 0, 0.3);
}

:root.dark .chat-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.chat-input:focus {
  border-color: rgba(102, 126, 234, 0.5);
}

.chat-input:disabled {
  opacity: 0.5;
}

.chat-send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.25);
  transition: all 0.2s;
}

:root.dark .chat-send-btn {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.3);
}

.chat-send-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  animation: bounce 1.4s infinite ease-in-out;
}

:root.dark .typing-indicator span {
  background: rgba(255, 255, 255, 0.4);
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}
.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
