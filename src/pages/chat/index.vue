<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import VueMarkdown from 'vue-markdown-render'

import { useChat } from '@/composables/useChat'
import { WINDOW_LABEL } from '@/constants'
import { hideWindow, showWindow } from '@/plugins/window'
import { useChatStore } from '@/stores/chat'
import { isTauri } from '@/utils/isTauri'

const chatStore = useChatStore()
const { sendMessage } = useChat()

const inputText = ref('')
const messagesRef = ref<HTMLDivElement>()
const showSettings = ref(false)

let appWindow: { startDragging: () => void } | undefined

if (isTauri) {
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  appWindow = getCurrentWebviewWindow()
}

function handleDrag() {
  appWindow?.startDragging()
}

async function handleSend() {
  if (!inputText.value.trim()) return

  const content = inputText.value
  inputText.value = ''
  await sendMessage(content)
  scrollToBottom()
}

async function handleClose() {
  if (isTauri) {
    await hideWindow(WINDOW_LABEL.CHAT)
    showWindow(WINDOW_LABEL.CHAT_TRIGGER)
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

function toggleSettings() {
  showSettings.value = !showSettings.value
}

function saveSettings() {
  showSettings.value = false
}

watch(() => chatStore.messages.length, scrollToBottom)
watch(() => chatStore.isStreaming, (streaming) => {
  if (streaming) scrollToBottom()
})
</script>

<template>
  <div
    class="chat-window"
    @mousedown="handleDrag"
  >
    <!-- Header -->
    <div class="chat-header">
      <div
        class="header-left"
        @click.stop="handleClose"
        @mousedown.stop
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </div>
      <div class="header-title">
        阿信（分身）
      </div>
      <div
        class="header-right"
        @click.stop="toggleSettings"
        @mousedown.stop
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </div>
    </div>

    <!-- Messages -->
    <div
      ref="messagesRef"
      class="chat-messages"
      @mousedown.stop
    >
      <div
        v-for="msg in chatStore.messages"
        :key="msg.id"
        class="message-row"
        :class="[msg.role]"
      >
        <img
          v-if="msg.role === 'assistant'"
          class="avatar"
          src="/ashin.jpg"
          alt="AI"
        >
        <div class="bubble" :class="[msg.role]">
          <template v-if="msg.content">
            <VueMarkdown v-if="msg.role === 'assistant'" :source="msg.content" class="markdown-body" />
            <template v-else>
              {{ msg.content }}
            </template>
          </template>
          <template v-else-if="msg.role === 'assistant' && chatStore.isStreaming">
            <span class="typing-dot" /><span class="typing-dot" /><span class="typing-dot" />
          </template>
        </div>
        <img
          v-if="msg.role === 'user'"
          class="avatar"
          src="/user.jpg"
          alt="User"
        >
      </div>
    </div>

    <!-- Input -->
    <div class="chat-input-area" @mousedown.stop>
      <input
        v-model="inputText"
        class="chat-input"
        :disabled="chatStore.isLoading"
        placeholder="输入消息..."
        @keydown.enter.prevent="handleSend"
      >
      <button
        class="send-btn"
        :class="{ active: inputText.trim() && !chatStore.isLoading }"
        :disabled="!inputText.trim() || chatStore.isLoading"
        @click.stop="handleSend"
      >
        发送
      </button>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false" @mousedown.stop>
      <div class="settings-modal">
        <div class="settings-header">
          <span>AI 配置</span>
          <svg
            class="settings-close"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            @click="showSettings = false"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <div class="settings-body">
          <div class="settings-label">
            接入协议
            <div class="radio-group">
              <label class="radio-item">
                <input v-model="chatStore.config.protocol" type="radio" value="openai">
                <span>OpenAI</span>
              </label>
              <label class="radio-item">
                <input v-model="chatStore.config.protocol" type="radio" value="anthropic">
                <span>Anthropic</span>
              </label>
            </div>
          </div>
          <label class="settings-label">
            API 地址
            <input v-model="chatStore.config.apiEndpoint" class="settings-input" placeholder="留空使用默认">
          </label>
          <label class="settings-label">
            API Key
            <input v-model="chatStore.config.apiKey" class="settings-input" type="password" placeholder="留空使用默认">
          </label>
          <label class="settings-label">
            模型
            <input v-model="chatStore.config.model" class="settings-input" placeholder="留空使用默认">
          </label>
        </div>
        <div class="settings-footer">
          <button class="settings-save-btn" @click="saveSettings">
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-window {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ededed;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #ededed;
  border-bottom: 1px solid #d9d9d9;
  -webkit-app-region: drag;
}

.header-left {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #191919;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #191919;
}

.header-right {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #191919;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.assistant {
  justify-content: flex-start;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  flex-shrink: 0;
  object-fit: cover;
}

.bubble {
  max-width: 65%;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
  position: relative;
}

.bubble.user {
  background: #95ec69;
  color: #191919;
  white-space: pre-wrap;
}

.bubble.assistant {
  background: #fff;
  color: #191919;
}

.bubble.assistant :deep(.markdown-body) {
  font-size: 15px;
  line-height: 1.6;
}

.bubble.assistant :deep(.markdown-body p) {
  margin: 0 0 8px;
}

.bubble.assistant :deep(.markdown-body p:last-child) {
  margin-bottom: 0;
}

.bubble.assistant :deep(.markdown-body pre) {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 8px 10px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 13px;
}

.bubble.assistant :deep(.markdown-body code) {
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 13px;
}

.bubble.assistant :deep(.markdown-body pre code) {
  background: none;
  padding: 0;
}

.bubble.assistant :deep(.markdown-body ul),
.bubble.assistant :deep(.markdown-body ol) {
  padding-left: 20px;
  margin: 4px 0;
}

.bubble.assistant :deep(.markdown-body blockquote) {
  border-left: 3px solid #ddd;
  padding-left: 10px;
  margin: 8px 0;
  color: #666;
}

.bubble.assistant :deep(.markdown-body h1),
.bubble.assistant :deep(.markdown-body h2),
.bubble.assistant :deep(.markdown-body h3) {
  margin: 8px 0 4px;
  font-size: 15px;
  font-weight: 600;
}

.chat-input-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f7f7f7;
  border-top: 1px solid #d9d9d9;
}

.chat-input {
  flex: 1;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  color: #191919;
  outline: none;
}

.chat-input:focus {
  border-color: #c0c0c0;
}

.chat-input::placeholder {
  color: #b0b0b0;
}

.chat-input:disabled {
  opacity: 0.6;
}

.send-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  background: #c0c0c0;
  color: #fff;
  transition: background 0.2s;
  white-space: nowrap;
}

.send-btn.active {
  background: #55b4f0;
}

.send-btn:disabled {
  cursor: not-allowed;
}

.typing-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #999;
  margin: 0 2px;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Settings Modal */
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.settings-modal {
  background: #fff;
  border-radius: 8px;
  width: 340px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  font-size: 16px;
  font-weight: 500;
  color: #191919;
}

.settings-close {
  cursor: pointer;
  color: #999;
}

.settings-close:hover {
  color: #333;
}

.settings-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

.radio-group {
  display: flex;
  gap: 16px;
  margin-top: 4px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #191919;
  cursor: pointer;
}

.radio-item input[type="radio"] {
  accent-color: #55b4f0;
}

.settings-input {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 14px;
  color: #191919;
  outline: none;
}

.settings-input:focus {
  border-color: #55b4f0;
}

.settings-textarea {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 14px;
  color: #191919;
  outline: none;
  resize: vertical;
  min-height: 60px;
}

.settings-textarea:focus {
  border-color: #55b4f0;
}

.settings-footer {
  padding: 12px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.settings-save-btn {
  padding: 8px 24px;
  background: #55b4f0;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.settings-save-btn:hover {
  background: #3da5e6;
}
</style>
