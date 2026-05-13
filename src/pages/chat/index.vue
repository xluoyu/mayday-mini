<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import VueMarkdown from 'vue-markdown-render'

import { Button, Empty, Input, InputPassword, Modal, RadioGroup, Watermark } from 'antdv-next'

import { useChat } from '@/composables/useChat'
import { AI_GUIDE_URL, WINDOW_LABEL } from '@/constants'
import { hideWindow, showWindow } from '@/plugins/window'
import { useChatStore } from '@/stores/chat'
import { isTauri } from '@/utils/isTauri'

let openUrl: ((url: string) => Promise<void>) | undefined

if (isTauri) {
  ({ openUrl } = await import('@tauri-apps/plugin-opener'))
}

function handleOpenGuide() {
  if (openUrl) {
    openUrl(AI_GUIDE_URL)
  } else {
    window.open(AI_GUIDE_URL, '_blank')
  }
}

const chatStore = useChatStore()
const { sendMessage, stopStreaming, clearHistory } = useChat()

const inputText = ref('')
const messagesRef = ref<HTMLDivElement>()
const showSettings = ref(false)

const isConfigured = computed(() => {
  return chatStore.config.enabled && !!(chatStore.config.apiEndpoint && chatStore.config.apiKey && chatStore.config.model)
})

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

function handleStop() {
  stopStreaming()
}

async function handleClose() {
  if (isTauri) {
    clearHistory()
    await hideWindow(WINDOW_LABEL.CHAT)
    await showWindow(WINDOW_LABEL.CHAT_TRIGGER)
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

function handleSettingsCancel() {
  showSettings.value = false
}

const protocolOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
]

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
      <!-- Empty state -->
      <Empty
        v-if="chatStore.messages.length === 0"
        description="请点击右上角 ⚙ 配置 API 地址、Key 和模型"
      >
        <template #image>
          <div class="empty-custom">
            <div class="empty-custom-image">⚙</div>
          </div>
        </template>
        <template #footer>
          <Button
            v-if="AI_GUIDE_URL"
            type="link"
            size="small"
            @click="handleOpenGuide"
          >
            查看接入说明 →
          </Button>
        </template>
      </Empty>

      <!-- Messages with watermark -->
      <Watermark
        v-else
        content="对话由AI生成"
        :z-index="0"
        :font-size="14"
        :rotate="-22"
        :gap="[80, 80]"
        class="watermark-wrap"
      >
        <div class="messages-content">
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
      </Watermark>
    </div>

    <!-- Input -->
    <div class="chat-input-area" @mousedown.stop>
      <Input
        v-model:value="inputText"
        :disabled="chatStore.isLoading"
        placeholder="输入消息..."
        @keydown.enter.prevent="handleSend"
      />
      <Button
        v-if="chatStore.isLoading"
        danger
        @click.stop="handleStop"
      >
        停止
      </Button>
      <Button
        v-else
        type="primary"
        :disabled="!inputText.trim()"
        @click.stop="handleSend"
      >
        发送
      </Button>
    </div>

    <!-- Settings Modal -->
    <Modal
      v-model:open="showSettings"
      title="AI 配置"
      centered
      width="360"
      @cancel="handleSettingsCancel"
    >
      <div class="settings-form">
        <div class="settings-field">
          <div class="settings-label">接入说明</div>
          <Button
            type="link"
            size="small"
            @click="handleOpenGuide"
          >
            查看接入说明 →
          </Button>
        </div>
        <div class="settings-field">
          <div class="settings-label">接入协议</div>
          <RadioGroup
            v-model:value="chatStore.config.protocol"
            :options="protocolOptions"
            option-type="button"
            button-style="solid"
          />
        </div>
        <div class="settings-field">
          <div class="settings-label">API 地址</div>
          <Input
            v-model:value="chatStore.config.apiEndpoint"
            placeholder="https://api.openai.com/v1"
          />
        </div>
        <div class="settings-field">
          <div class="settings-label">API Key</div>
          <InputPassword
            v-model:value="chatStore.config.apiKey"
            placeholder="sk-..."
          />
        </div>
        <div class="settings-field">
          <div class="settings-label">模型</div>
          <Input
            v-model:value="chatStore.config.model"
            placeholder="gpt-4o"
          />
        </div>
      </div>
      <template #footer>
        <Button @click="handleSettingsCancel">
          取消
        </Button>
        <Button type="primary" @click="showSettings = false">
          保存
        </Button>
      </template>
    </Modal>
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
  padding: 16px 12px 32px;
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

.watermark-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: visible !important;
}

.messages-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
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

/* Settings form */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-label {
  font-size: 13px;
  color: #666;
}

.empty-custom-image {
  font-size: 48px;
  opacity: 0.4;
}
</style>
