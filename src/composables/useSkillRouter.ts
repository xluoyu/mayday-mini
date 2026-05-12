import { resolveResource } from '@tauri-apps/api/path'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { isTauri } from '@/utils/isTauri'

const moduleCache = new Map<string, string>()
let coreCache: string | null = null

const MODULE_CATALOG = `
可选模块列表（返回对应ID即可）：
- 01-daily-persona: 日常闲聊（吃喝玩乐、琐事、碎碎念、生活习惯）
- 02-fan-culture: 粉丝/社群/周边（wmls、卜卜、五迷、演唱会、粉丝互动）
- 03-mental-models: 人生困惑/价值观/深度话题（坚持、困境、人生哲学、方向迷茫）
- 04-heuristics: 具体建议/决策（该怎么办、要不要、选择、机会）
- 05-expression-dna: 严肃/创作/哲学表达风格（深度模式的语气和节奏）
- 06-timeline: 时间线/5525巡演/最近动态（鸟巢、出道、年龄、里程碑）
- 07-values-lineage: 价值观/反对什么/自创概念（后青春期、STAYREAL）
- 08-honesty-sources: 被质疑权威性/需引用来源（真说过吗、出处）
`

const CLASSIFY_SYSTEM_PROMPT = `你是一个意图分类器。根据用户的消息，判断需要加载哪些参考模块来辅助回答。

${MODULE_CATALOG}

规则：
- 返回 1-3 个最相关的模块ID（如 "03-mental-models"）
- 日常闲聊通常只需 01
- 深度话题通常需要 03 + 05
- 不确定时，默认返回 03
- 只返回 JSON 数组，不要其他内容

示例：
用户："晚饭吃什么" → ["01-daily-persona"]
用户："最近很迷茫不知道该不该辞职" → ["03-mental-models", "05-expression-dna"]
用户："wmls是什么" → ["02-fan-culture"]
`

async function classifyQuestion(
  content: string,
  apiUrl: string,
  apiKey: string,
  model: string,
  protocol: string,
): Promise<string[]> {
  try {
    const url = protocol === 'anthropic'
      ? `${apiUrl}/v1/messages`
      : `${apiUrl}/chat/completions`

    const body = protocol === 'anthropic'
      ? {
          model,
          max_tokens: 100,
          system: CLASSIFY_SYSTEM_PROMPT,
          messages: [{ role: 'user', content }],
        }
      : {
          model,
          messages: [
            { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
            { role: 'user', content },
          ],
          max_tokens: 100,
        }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) return ['03-mental-models']

    const data = await response.json()
    const text = protocol === 'anthropic'
      ? data.content?.[0]?.text
      : data.choices?.[0]?.message?.content

    const parsed = JSON.parse(text)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  }
  catch {
    // 分类失败，使用默认模块
  }
  return ['03-mental-models']
}

export async function buildSystemPrompt(
  userMessage: string,
  apiUrl: string,
  apiKey: string,
  model: string,
  protocol: string,
): Promise<string> {
  if (!isTauri) return ''

  if (!coreCache) {
    const corePath = await resolveResource('assets/skill/core.md')
    coreCache = await readTextFile(corePath)
  }

  const moduleIds = await classifyQuestion(userMessage, apiUrl, apiKey, model, protocol)
  const modules: string[] = []

  for (const id of moduleIds) {
    if (!moduleCache.has(id)) {
      const path = await resolveResource(`assets/skill/modules/${id}.md`)
      moduleCache.set(id, await readTextFile(path))
    }
    modules.push(moduleCache.get(id)!)
  }

  return [coreCache, '\n---以下为本次对话加载的参考模块---\n', ...modules].join('\n\n')
}
