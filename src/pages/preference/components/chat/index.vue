<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { Button, Input, InputPassword, Popconfirm, RadioGroup, Switch } from 'antdv-next'

import ProListItem from '@/components/pro-list-item/index.vue'
import ProList from '@/components/pro-list/index.vue'
import { useChat } from '@/composables/useChat'
import { AI_GUIDE_URL } from '@/constants'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const { clearHistory } = useChat()

const protocolOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
]
</script>

<template>
  <ProList :title="$t('pages.preference.chat.labels.apiConfig')">
    <ProListItem
      title="AI 对话"
    >
      <Switch v-model:checked="chatStore.config.enabled" />
    </ProListItem>

    <ProListItem
      title="接入说明"
    >
      <Button
        v-if="AI_GUIDE_URL"
        size="small"
        type="link"
        @click="openUrl(AI_GUIDE_URL)"
      >
        查看接入说明 →
      </Button>
    </ProListItem>

    <ProListItem
      title="接入协议"
    >
      <RadioGroup
        v-model:value="chatStore.config.protocol"
        button-style="solid"
        option-type="button"
        :options="protocolOptions"
      />
    </ProListItem>

    <ProListItem
      description="如 https://api.openai.com/v1"
      :title="$t('pages.preference.chat.labels.apiEndpoint')"
    >
      <Input
        v-model:value="chatStore.config.apiEndpoint"
        class="w-1/2"
        placeholder="https://api.openai.com/v1"
      />
    </ProListItem>

    <ProListItem
      :description="$t('pages.preference.chat.hints.apiKey')"
      :title="$t('pages.preference.chat.labels.apiKey')"
    >
      <InputPassword
        v-model:value="chatStore.config.apiKey"
        class="w-1/2"
        placeholder="sk-..."
      />
    </ProListItem>

    <ProListItem
      :title="$t('pages.preference.chat.labels.model')"
    >
      <Input
        v-model:value="chatStore.config.model"
        class="w-1/2"
        placeholder="gpt-4o"
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
