# AI Skill 集成设计方案

## 概述

在现有 AI 对话功能基础上，集成 ashin-perspective 角色扮演 skill，使 AI 能以五月天阿信（陈信宏）的视角进行对话。设计为通用 skill 框架，未来可扩展支持其他 skill。

## Skill 资源

**来源路径**: `/Users/changjia/.agents/skills/ashin-perspective/`

| 文件                                       | 大小  | 用途                                                                         |
| ------------------------------------------ | ----- | ---------------------------------------------------------------------------- |
| `SKILL.md`                                 | ~30KB | 核心人设：角色规则、4种回复模式、6个心智模型、9条决策启发式、表达DNA、时间线 |
| `references/quotes.md`                     | ~25KB | 分类语录库：演唱会talking、歌词、Instagram长文、访谈、书摘、早期博客         |
| `references/research/01-writings.md`       | ~5KB  | 阿信文字作品研究                                                             |
| `references/research/02-conversations.md`  | ~5KB  | 对话与即兴思维研究                                                           |
| `references/research/03-expression-dna.md` | ~5KB  | 表达风格DNA分析                                                              |
| `references/research/04-external-views.md` | ~5KB  | 外部视角与评价                                                               |
| `references/research/05-decisions.md`      | ~5KB  | 关键人生决策研究                                                             |
| `references/research/06-timeline.md`       | ~5KB  | 完整人生时间线                                                               |

**总计**: ~85KB, 约 25,000 tokens

## 架构设计

### 核心思路

1. Skill 文件存储在本地磁盘，运行时通过 `@tauri-apps/plugin-fs` 动态加载
2. 以模块为粒度进行开关控制（文件级别：核心人格 / 语录库 / 研究资料）
3. 拼接后的 skill 内容作为 system message 注入 API 请求
4. 与现有 system prompt 输入框共存——skill 提供角色基底，输入框用于补充指令

### 数据模型

```typescript
// src/types/skill.ts

/** Skill 中的单个可加载模块 */
interface SkillModule {
  id: string // "core", "quotes", "research-01-writings" 等
  label: string // 人类可读名称："核心人格", "语录库"
  filePath: string // 磁盘上的绝对路径
  category: 'core' | 'reference' | 'research'
  enabled: boolean // 开关状态（持久化到磁盘）
  content: string // 文件内容（运行时加载，不持久化）
}

/** Skill 顶层定义 */
interface Skill {
  id: string // "ashin-perspective"
  name: string // 从 SKILL.md frontmatter 提取
  description: string // 从 frontmatter 提取
  basePath: string // skill 目录的绝对路径
  modules: SkillModule[]
}
```

### System Prompt 组装

```
[用户在设置中输入的补充指令]

---

[SKILL.md 核心内容（始终启用）]

---

[references/quotes.md 语录库（可选）]

---

[references/research/*.md 研究资料（可选）]
```

调用链路：`useChat.sendMessage()` → `skillStore.buildSystemPrompt(basePrompt)` → 发送给 API

### 模块加载策略

| 模块     | 文件                       | 默认状态 | 说明                            |
| -------- | -------------------------- | -------- | ------------------------------- |
| 核心人格 | `SKILL.md`                 | 始终启用 | 角色规则、心智模型、表达风格    |
| 语录库   | `references/quotes.md`     | 默认启用 | 丰富的语料支撑，减少 AI 编造    |
| 研究资料 | `references/research/*.md` | 默认关闭 | 事实验证用，开启增加 token 消耗 |

## 实现计划

### Phase 1: 数据层（4 个新文件）

| 文件                          | 职责                                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `src/types/skill.ts`          | `SkillModule`、`Skill` 接口定义                                    |
| `src/stores/skill.ts`         | Pinia store：skill 列表、激活状态、模块开关、`buildSystemPrompt()` |
| `src/composables/useSkill.ts` | 文件 I/O：扫描目录、读取文件、解析 frontmatter                     |
| `src/utils/skill.ts`          | `estimateTokens()` 工具函数                                        |

**关键实现细节**:

- Store 使用 `tauri.filterKeys` 持久化开关状态（参考 `src/stores/model.ts:68-70`）
- 文件内容不持久化，每次会话从磁盘加载
- Frontmatter 解析用正则实现（`---` 分隔，提取 `name` 和 `description`）
- 默认 skill 路径通过 `homeDir()` 解析 `~/.agents/skills/`

### Phase 2: 聊天集成（修改 2 个文件）

| 文件                         | 改动                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `src/composables/useChat.ts` | 第 19-21 行：`config.systemPrompt` → `skillStore.buildSystemPrompt(config.systemPrompt)` |
| `src/pages/chat/index.vue`   | 标题区域：显示激活的 skill 名称，无 skill 时显示 "AI Chat"                               |

### Phase 3: 设置页 UI（2 个新文件 + 修改 1 个文件）

| 文件                                                          | 职责                  |
| ------------------------------------------------------------- | --------------------- |
| `src/pages/preference/components/chat/skill/SkillList.vue`    | skill 列表、激活/停用 |
| `src/pages/preference/components/chat/skill/SkillModules.vue` | 模块开关 + token 估算 |
| `src/pages/preference/components/chat/index.vue`              | 插入 "AI Skills" 区块 |

布局结构：

```
ProList "AI Skills"
  SkillList（发现的 skills，点击激活/停用）
  SkillModules（激活后显示各模块开关 + token 估算）

ProList "API Configuration"（不变）
ProList "System Prompt"（有 skill 时标签变为 "补充指令"）
ProList "History"（不变）
```

### Phase 4: i18n（修改 5 个语言文件）

新增 `pages.preference.chat.skills` 命名空间翻译。

### Phase 5: 初始化注册（修改 2 个文件）

| 文件                 | 改动                                   |
| -------------------- | -------------------------------------- |
| `src/stores/chat.ts` | `ChatConfig` 新增 `skillBasePath` 字段 |
| `src/App.vue`        | `onMounted` 中初始化 skill store       |

## 关键设计决策

| 决策          | 选择                                 | 理由                                                   |
| ------------- | ------------------------------------ | ------------------------------------------------------ |
| 模块粒度      | 文件级（非 section 级）              | SKILL.md 30KB 完全加载不超限，省去 markdown 解析复杂度 |
| 加载时机      | 懒加载（打开聊天/激活 skill 时）     | 不阻塞主窗口启动                                       |
| 同时激活数    | 单个 skill                           | 避免多人格混淆 LLM                                     |
| Skill 路径    | 用户可配置，默认 `~/.agents/skills/` | 灵活扩展，无需重编译                                   |
| System Prompt | 与 skill 共存（叠加模式）            | 兼容不使用 skill 的场景                                |

## 验证清单

- [ ] 设置页自动发现 ashin-perspective skill
- [ ] 激活/停用 skill 正常切换
- [ ] 模块开关控制（核心始终启用，语录/研究可切换）
- [ ] Token 估算显示准确
- [ ] 聊天窗口标题随 skill 切换
- [ ] AI 以阿信角色回复，语气符合 expression DNA
- [ ] 补充指令与 skill 内容叠加生效
- [ ] 停用 skill 后恢复原始 system prompt 行为
- [ ] 重启应用后 skill 状态保持
