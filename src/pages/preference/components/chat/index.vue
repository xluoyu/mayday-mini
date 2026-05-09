<script setup lang="ts">
import { Input, InputNumber, Popconfirm, Select, Slider } from 'antdv-next'

import ProListItem from '@/components/pro-list-item/index.vue'
import ProList from '@/components/pro-list/index.vue'
import { useChat } from '@/composables/useChat'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const { clearHistory } = useChat()

const modelOptions = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
  { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
]
</script>

<template>
  <ProList :title="$t('pages.preference.chat.labels.apiConfig')">
    <ProListItem
      :description="$t('pages.preference.chat.hints.apiEndpoint')"
      :title="$t('pages.preference.chat.labels.apiEndpoint')"
    >
      <Input
        v-model:value="chatStore.config.apiEndpoint"
        class="w-full"
        placeholder="https://api.openai.com/v1"
      />
    </ProListItem>

    <ProListItem
      :description="$t('pages.preference.chat.hints.apiKey')"
      :title="$t('pages.preference.chat.labels.apiKey')"
    >
      <Input
        v-model:value="chatStore.config.apiKey"
        class="w-full"
        placeholder="sk-..."
        type="password"
      />
    </ProListItem>

    <ProListItem
      :description="$t('pages.preference.chat.hints.model')"
      :title="$t('pages.preference.chat.labels.model')"
    >
      <Select
        v-model:value="chatStore.config.model"
        class="w-full"
        :options="modelOptions"
        show-search
      />
    </ProListItem>

    <ProListItem
      :title="$t('pages.preference.chat.labels.systemPrompt')"
    >
      <Textarea
        v-model:value="chatStore.config.systemPrompt"
        :rows="3"
      />
    </ProListItem>

    <ProListItem :title="$t('pages.preference.chat.labels.temperature')">
      <Slider
        v-model:value="chatStore.config.temperature"
        class="m-0!"
        :max="2"
        :min="0"
        :step="0.1"
      />
    </ProListItem>

    <ProListItem :title="$t('pages.preference.chat.labels.maxTokens')">
      <InputNumber
        v-model:value="chatStore.config.maxTokens"
        class="w-24"
        :max="128000"
        :min="100"
      />
    </ProListItem>
  </ProList>

  <ProList :title="$t('pages.preference.chat.labels.history')">
    <ProListItem :title="$t('pages.preference.chat.labels.clearHistory')">
      <Popconfirm
        :cancel-text="$t('pages.preference.chat.buttons.cancel')"
        :description="$t('pages.preference.chat.hints.clearHistoryConfirm')"
        :ok-text="$t('pages.preference.chat.buttons.confirm')"
        @confirm="clearHistory"
      >
        <template #reference>
          <a-button
            danger
            size="small"
          >
            {{ $t('pages.preference.chat.buttons.clear') }}
          </a-button>
        </template>
      </Popconfirm>
    </ProListItem>
  </ProList>
</template>
