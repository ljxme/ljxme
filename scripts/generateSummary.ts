/**
 * 为 MD/MDX 文章生成并写入 AI 摘要（静态）
 * 使用方法：运行 tsx scripts/generateSummary.ts
 * 配置来源优先级：
 * 1) src/plugins/custom.ts 顶部注释中的 AI_SUMMARY_API / AI_SUMMARY_KEY
 * 2) 进程环境变量 AI_SUMMARY_API / AI_SUMMARY_KEY
 *
 * 说明：
 * - 若未配置 API，将使用本地简易规则生成摘要（截取正文前 200~300 字）。
 * - 脚本会扫描 src/content/blog/** 下的 index.md 或 index.mdx 文件，读取正文与前言并写入 summary 字段。
 */

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const ROOT = process.cwd()
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog')
// 摘要目标长度（500字的单句陈述，结尾必须为句号）
const SUMMARY_MAX_LEN = 500

/**
 * 日志等级类型定义
 * 0：仅错误；1：信息（生成与裁剪等）；2：调试（详细输出）
 */
type LogLevel = 0 | 1 | 2

/**
 * 已有摘要的覆盖策略
 * ask：逐篇询问；always：总是覆盖；never：从不覆盖（跳过写入）
 */
type OverwritePolicy = 'ask' | 'always' | 'never'

// 运行时日志等级（默认 1），由配置读取后在 run() 中设定
let currentLogLevel: LogLevel = 1

/**
 * 是否在提交给摘要 API 前清洗正文的布尔开关。
 * 读取顺序：优先 src/plugins/aisummary.config.js 注释键值，其次环境变量。
 * 默认：false（不清洗）。
 */
function readCleanBeforeAPIFromCustom(): boolean | null {
  const customPath = path.join(ROOT, 'src', 'plugins', 'aisummary.config.js')
  if (!fs.existsSync(customPath)) return null
  const content = fs.readFileSync(customPath, 'utf-8')
  const m = content.match(/^[\t ]*\/\/\s*AISUMMARY_CLEAN_BEFORE_API\s*[:=]\s*(true|false|1|0)\s*$/mi)
  if (!m) return null
  const v = m[1].toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return null
}

/**
 * 从环境变量读取是否清洗正文（AISUMMARY_CLEAN_BEFORE_API）。
 * 支持：true/false/1/0/yes/no（不区分大小写）。
 */
function readCleanBeforeAPIFromEnv(): boolean | null {
  const raw = (process.env.AISUMMARY_CLEAN_BEFORE_API || '').trim()
  if (!raw) return null
  const v = raw.toLowerCase()
  if (['true', '1', 'yes', 'y'].includes(v)) return true
  if (['false', '0', 'no', 'n'].includes(v)) return false
  return null
}

/**
 * 获取是否在提交 API 前清洗正文的最终布尔值，默认 false。
 */
function getCleanBeforeAPI(): boolean {
  const v = readCleanBeforeAPIFromCustom()
  if (v !== null) return v
  const e = readCleanBeforeAPIFromEnv()
  if (e !== null) return e
  return false
}

/**
 * 判断字符串是否为纯 ASCII（避免在 HTTP 头中出现非 ASCII 导致 ByteString 报错）
 */
function isASCII(str: string): boolean {
  return /^[\x00-\x7F]*$/.test(str)
}

/**
 * 从 src/plugins/aisummary.config.js 的文件注释中读取 AI 摘要相关配置。
 * 格式示例：
 * // AI_SUMMARY_API=https://example.com/api/summary
 * // AI_SUMMARY_KEY=your-api-key
 */
function readAIConfigFromCustom(): { api: string | null; key: string | null } {
  const customPath = path.join(ROOT, 'src', 'plugins', 'aisummary.config.js')
  if (!fs.existsSync(customPath)) {
    return { api: null, key: null }
  }
  const content = fs.readFileSync(customPath, 'utf-8')
  const read = (key: string): string | null => {
    const re = new RegExp('^\\s*//\\s*' + key + '\\s*[:=]\\s*(.+)$', 'm')
    const m = content.match(re)
    if (!m) return null
    let val = m[1].trim()
    // 去除收尾引号与内联注释
    val = val
      .replace(/^['"]/,'')
      .replace(/['"]$/,'')
      .replace(/\s+\/\/.*$/,'')
      .replace(/[;]+$/,'')
      .trim()

    return val.length ? val : null
  }
  return {
    api: read('AI_SUMMARY_API'),
    key: read('AI_SUMMARY_KEY'),
  }
}

/**
 * 从 aisummary.config.js 的注释配置中读取字数限制（AISUMMARY_WORD_LIMIT）。
 * 支持格式：// AISUMMARY_WORD_LIMIT=8000 或 // AISUMMARY_WORD_LIMIT: 8000
 */
function readWordLimitFromCustom(): number | null {
  const customPath = path.join(ROOT, 'src', 'plugins', 'aisummary.config.js')
  if (!fs.existsSync(customPath)) return null
  const content = fs.readFileSync(customPath, 'utf-8')
  const m = content.match(/^\s*\/\/\s*AISUMMARY_WORD_LIMIT\s*[:=]\s*([0-9]+)\s*$/m)
  if (!m) return null
  const v = parseInt(m[1], 10)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * 从环境变量读取字数限制（AISUMMARY_WORD_LIMIT）
 */
function readWordLimitFromEnv(): number | null {
  const envVal = process.env.AISUMMARY_WORD_LIMIT || ''
  const v = parseInt(envVal, 10)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * 获取最大字数限制（默认 8000）：优先 aisummary.config.js，其次环境变量。
 */
function getWordLimit(): number {
  return readWordLimitFromCustom() ?? readWordLimitFromEnv() ?? 8000
}

/**
 * 从 aisummary.config.js 的注释配置中读取日志等级（AISUMMARY_LOG_LEVEL，0/1/2）
 */
function readLogLevelFromCustom(): LogLevel | null {
  const customPath = path.join(ROOT, 'src', 'plugins', 'aisummary.config.js')
  if (!fs.existsSync(customPath)) return null
  const content = fs.readFileSync(customPath, 'utf-8')
  const m = content.match(/^\s*\/\/\s*AISUMMARY_LOG_LEVEL\s*[:=]\s*([0-2])\s*$/m)
  if (!m) return null
  const v = parseInt(m[1], 10)
  return (v === 0 || v === 1 || v === 2) ? (v as LogLevel) : null
}

/**
 * 从环境变量读取日志等级（AISUMMARY_LOG_LEVEL），允许 0/1/2
 */
function readLogLevelFromEnv(): LogLevel | null {
  const envVal = process.env.AISUMMARY_LOG_LEVEL || ''
  const v = parseInt(envVal, 10)
  return (v === 0 || v === 1 || v === 2) ? (v as LogLevel) : null
}

/**
 * 获取日志等级，默认 1
 */
function getLogLevel(): LogLevel {
  return readLogLevelFromCustom() ?? readLogLevelFromEnv() ?? 1
}

/**
 * 从 aisummary.config.js 的注释配置中读取并发处理数（AISUMMARY_CONCURRENCY）
 * 建议不高于 5
 */
function readConcurrencyFromCustom(): number | null {
  const customPath = path.join(ROOT, 'src', 'plugins', 'aisummary.config.js')
  if (!fs.existsSync(customPath)) return null
  const content = fs.readFileSync(customPath, 'utf-8')
  const m = content.match(/^\s*\/\/\s*AISUMMARY_CONCURRENCY\s*[:=]\s*([0-9]+)\s*$/m)
  if (!m) return null
  const v = parseInt(m[1], 10)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * 从环境变量读取并发处理数（AISUMMARY_CONCURRENCY）
 */
function readConcurrencyFromEnv(): number | null {
  const envVal = process.env.AISUMMARY_CONCURRENCY || ''
  const v = parseInt(envVal, 10)
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * 将并发处理数限制在区间 [1, 5]
 */
function clampConcurrency(n: number): number {
  return Math.max(1, Math.min(5, n))
}

/**
 * 获取并发处理数（默认 3），限定在 [1,5]
 */
function getConcurrency(): number {
  const c = readConcurrencyFromCustom() ?? readConcurrencyFromEnv() ?? 3
  return clampConcurrency(c)
}

/**
 * 统一日志输出入口（根据 currentLogLevel 控制）
 * 等级 0（错误）始终输出；等级 1（信息）和 2（调试）受 currentLogLevel 控制。
 * @param level 日志等级：0 错误；1 信息；2 调试
 * @param message 要输出的文本消息
 */
function log(level: LogLevel, message: string): void {
  const label = level === 0 ? '❌ 错误' : level === 1 ? 'ℹ️ 信息' : '🐞 调试'
  const time = level === 2 ? ` ${formatTime()}` : ''
  const line = `${label}${time ? ' |' + time : ''} | ${message}`
  if (level === 0) {
    console.error(line)
    return
  }
  if (level <= currentLogLevel) {
    console.log(line)
  }
}

/**
 * 格式化当前时间为 HH:MM:SS，用于调试级日志的时间标记。
 * @returns 形如 "12:34:56" 的时间字符串
 */
function formatTime(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 判断 frontmatter 中是否已有 summary 字段
 * @param frontmatter frontmatter 字符串（包含分隔线）
 * @returns 是否存在 summary
 */
function hasSummaryInFrontmatter(frontmatter: string): boolean {
  if (!frontmatter) return false
  return /(^|\n)\s*summary\s*:/i.test(frontmatter)
}

/**
 * 从 frontmatter 中读取现有 summary 文本（仅单行）用于提示预览
 * @param frontmatter frontmatter 字符串
 * @returns 摘要文本（去除引号与首尾空白）
 */
function readSummaryFromFrontmatter(frontmatter: string): string {
  if (!frontmatter) return ''
  const lines = frontmatter.split(/\r?\n/)
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  const inner = endIdx > -1 ? lines.slice(1, endIdx) : lines.slice(1)
  for (const l of inner) {
    const m = l.match(/^\s*summary\s*:\s*(.*)$/i)
    if (m) {
      return m[1].trim().replace(/^['"]/, '').replace(/['"]$/, '')
    }
  }
  return ''
}

/**
 * 从配置文件注释读取覆盖策略（AISUMMARY_OVERWRITE_EXISTING）
 * 支持 ask/always/never（大小写不敏感）
 */
function readOverwritePolicyFromCustom(): OverwritePolicy | null {
  const customPath = path.join(ROOT, 'src', 'plugins', 'aisummary.config.js')
  if (!fs.existsSync(customPath)) return null
  const content = fs.readFileSync(customPath, 'utf-8')
  const m = content.match(/^\s*\/\/\s*AISUMMARY_OVERWRITE_EXISTING\s*[:=]\s*(\w+)\s*$/mi)
  if (!m) return null
  const v = m[1].toLowerCase()
  if (v === 'ask' || v === 'always' || v === 'never') return v as OverwritePolicy
  if (['yes', 'y', 'true', '1'].includes(v)) return 'always'
  if (['no', 'n', 'false', '0'].includes(v)) return 'never'
  return null
}

/**
 * 从环境变量读取覆盖策略（AISUMMARY_OVERWRITE_EXISTING）
 * 支持 ask/always/never 及 yes/no/true/false/1/0
 */
function readOverwritePolicyFromEnv(): OverwritePolicy | null {
  const raw = (process.env.AISUMMARY_OVERWRITE_EXISTING || '').trim().toLowerCase()
  if (!raw) return null
  if (raw === 'ask' || raw === 'always' || raw === 'never') return raw as OverwritePolicy
  if (['yes', 'y', 'true', '1'].includes(raw)) return 'always'
  if (['no', 'n', 'false', '0'].includes(raw)) return 'never'
  return null
}

/**
 * 获取覆盖策略，默认：交互式终端使用 ask，非交互终端使用 never
 * @param isInteractive 当前是否为交互式 TTY
 */
function getOverwritePolicy(isInteractive: boolean): OverwritePolicy {
  const c = readOverwritePolicyFromCustom()
  if (c) return c
  const e = readOverwritePolicyFromEnv()
  if (e) return e
  return isInteractive ? 'ask' : 'never'
}

/**
 * 交互式询问是否覆盖现有摘要（逐篇）
 * @param question 提示文本
 * @param defaultYes 默认答案（true 为 yes，false 为 no）
 */
async function promptYesNo(question: string, defaultYes = false): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const suffix = defaultYes ? ' [Y/N] ' : ' [y/n] '
  return await new Promise<boolean>((resolve) => {
    rl.question(question + suffix, (ans) => {
      rl.close()
      const v = (ans || '').trim().toLowerCase()
      if (!v) return resolve(defaultYes)
      resolve(v === 'y' || v === 'yes')
    })
  })
}

/**
 * 移除 MDX/Astro 组件与 import/export 语句，避免摘要受组件干扰。
 * 处理内容：
 * - 删除 MDX 中的 `import ...` 和 `export ...` 行（逐行）
 * - 删除自闭合大写组件标签：`<Component ... />`
 * - 删除成对大写组件标签及其中内容：`<Component ...> ... </Component>`
 * 说明：组件名以大写字母开头视为 Astro/MDX 组件；保留普通文本与 Markdown 内容。
 * @param text 原文字符串
 * @returns 移除组件与导入导出后的文本
 */
function stripAstroAndMDXComponents(text: string): string {
  if (!text) return ''
  let s = String(text)
  // 移除 import/export 行（整行）
  s = s.replace(/^[ \t]*import[^\n]*;?\s*$/gm, '')
  s = s.replace(/^[ \t]*export[^\n]*;?\s*$/gm, '')
  // 移除自闭合组件标签：<Component ... />
  s = s.replace(/<([A-Z][A-Za-z0-9_.-]*)\b[^>]*\/>/g, '')
  // 移除成对组件标签及其中内容：<Component ...> ... </Component>
  s = s.replace(/<([A-Z][A-Za-z0-9_.-]*)\b[^>]*>[\s\S]*?<\/\1>/g, '')
  return s
}

/**
 * 针对提交到摘要 API 的正文清洗：移除代码块/行内代码/图片/链接标记/HTML 等，压缩空白。
 * 注意：不做句式整形与标点替换，只保留可读纯文本，适合 API 处理。
 * @param body 原始正文（可能包含 Markdown/HTML）
 * @returns 清洗后的纯文本正文
 */
function sanitizeBodyForAPI(body: string): string {
  if (!body) return ''
  let s = stripAstroAndMDXComponents(String(body))
  return s
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^[ \t]*#{1,6}[^\n]*\n/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * 安全截取文本前若干字符用于日志预览（不影响摘要逻辑）。
 * 处理：替换换行为空格、压缩连续空白，避免日志过长或难以阅读。
 * @param text 原始文本
 * @param max 最大预览字符数（默认 120）
 * @returns 适合日志输出的短预览字符串
 */
function previewText(text: string, max = 120): string {
  const s = (text || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return s.length > max ? s.slice(0, max) + '…' : s
}

/**
 * 根据限制截断正文到指定最大字符数；保留原文长度不足的情况。
 */
function limitBody(body: string, maxChars: number): string {
  if (!Number.isFinite(maxChars) || maxChars <= 0) return body
  return body.length > maxChars ? body.slice(0, maxChars) : body
}

/**
 * 递归查找目录下所有 index.md 或 index.mdx 文件
 */
function findMarkdownEntries(dir: string): string[] {
  const results: string[] = []
  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fp = path.join(dir, item.name)
    if (item.isDirectory()) {
      results.push(...findMarkdownEntries(fp))
    } else if (item.isFile() && /index\.mdx?$/.test(item.name)) {
      results.push(fp)
    }
  }
  return results
}

/**
 * 提取“主” frontmatter 与正文。
 * 只提取第一个以 `---` 包裹的 frontmatter 区块，
 * 自动兼容没有空行的情况。
 * 注意：摘要生成与 API 提交仅使用正文（body），不提交 frontmatter。
 */
function splitFrontmatterAndBody(content: string): { frontmatter: string; body: string } {
  // 去除文件开头可能的 BOM 和多余空行
  content = content.replace(/^\uFEFF?/, '').trimStart()

  // 允许 frontmatter 后无换行或紧接正文
  // 支持 Windows (CRLF) 与 Unix (LF) 换行
  const re = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/
  const match = re.exec(content)

  if (!match) {
    return { frontmatter: '', body: content }
  }

  const start = match.index
  let fm = match[0]
  let tail = content.slice(start + fm.length)

  // 若 frontmatter 后紧跟另一个 frontmatter，进行合并，避免重复块
  const second = re.exec(tail)
  if (second && second.index === 0) {
    const fm2 = second[0]
    fm = mergeFrontmatterBlocks(fm, fm2)
    tail = tail.slice(fm2.length)
  }

  const body = tail.replace(/^\r?\n*/, '') // 去掉多余空行
  return { frontmatter: fm, body }
}

/**
 * 仅提取正文，忽略文件起始处的 frontmatter 区块（`---` 包裹）。
 * 用途：摘要生成与 API 提交，只保留文章正文。
 * 兼容：前导 BOM、frontmatter 后紧邻另一个 frontmatter 的异常情况。
 * @param content 整个 MD/MDX 文件内容
 * @returns 去除 frontmatter 后的纯正文字符串
 */
function extractBodyOnly(content: string): string {
  // 去除文件开头可能的 BOM 和多余空行
  let s = String(content || '').replace(/^\uFEFF?/, '').trimStart()
  const re = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/
  const m = re.exec(s)
  if (!m) return s
  let tail = s.slice(m.index + m[0].length)
  // 若 frontmatter 后紧跟另一个 frontmatter，继续跳过
  const second = re.exec(tail)
  if (second && second.index === 0) {
    tail = tail.slice(second[0].length)
  }
  return tail.replace(/^\r?\n*/, '')
}

/**
 * 合并两个相邻的 YAML frontmatter 块（各自以 `---` 包裹）。
 * 处理策略：
 * - 去除两侧分隔线，仅拼接内部内容；
 * - 去重已有的 `summary:` 行，保留后续统一写入的位置；
 * - 结果始终包含收尾分隔线与结尾换行。
 */
function mergeFrontmatterBlocks(fm1: string, fm2: string): string {
  const lines1 = fm1.split(/\r?\n/)
  const lines2 = fm2.split(/\r?\n/)
  const endIdx1 = lines1.findIndex((l, i) => i > 0 && l.trim() === '---')
  const endIdx2 = lines2.findIndex((l, i) => i > 0 && l.trim() === '---')
  const inner1 = endIdx1 > -1 ? lines1.slice(1, endIdx1) : lines1.slice(1)
  const inner2 = endIdx2 > -1 ? lines2.slice(1, endIdx2) : lines2.slice(1)

  const cleaned1 = inner1.filter(l => !/^\s*summary\s*:/i.test(l))
  const cleaned2 = inner2.filter(l => !/^\s*summary\s*:/i.test(l))

  const combined = ['---', ...cleaned1, ...cleaned2, '---']
  const fmStr = combined.join('\n')
  return fmStr.endsWith('\n') ? fmStr : fmStr + '\n'
}

/**
 * 清洗任意文本为摘要友好格式（单段、纯文本、约定最大长度）。
 * 处理步骤：
 * - 移除代码块（``` ... ```）与行内代码（`...`）
 * - 移除图片与保留超链接可读文本（[text](url) -> text）
 * - 去除标题/引用/列表开头的 Markdown 语法符号
 * - 去除 HTML 标签，压缩空白，替换换行为空格
 * - 截断到 SUMMARY_MAX_LEN，保证结尾有句号或省略号
 */
function sanitizeSummaryText(text: string, maxLen = SUMMARY_MAX_LEN): string {
  if (!text) return ''
  let s = String(text)
  // 去除三引号代码块
  s = s.replace(/```[\s\S]*?```/g, '')
  // 去除行内代码
  // s = s.replace(/`[^`]*`/g, '')
  // 图片
  s = s.replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
  // 链接，保留可读文本
  s = s.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  // 去除加粗/斜体标记
  s = s.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
  s = s.replace(/__([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1')
  // 标题/引用/列表标记
  s = s.replace(/^[ \t]*#{1,6}[^\n]*\n/gm, '')
  s = s.replace(/^>\s+/gm, '')
  s = s.replace(/^[ \t]*[-*+]\s+/gm, '')
  s = s.replace(/^[ \t]*\d+\.\s+/gm, '')
  // HTML 标签
  s = s.replace(/<[^>]+>/g, '')
  // 压缩空白与换行
  s = s.replace(/\r?\n+/g, ' ')
  s = s.replace(/\s{2,}/g, ' ').trim()

  if (!s) return ''
  return toDeclarativeSentence(s, maxLen)
}

/**
 * 判断文本是否包含代码特征，避免将代码样式内容作为摘要。
 * 说明：使用简单打分规则以降低误判率（例如普通句子中的句号不应触发代码判定）。
 * 规则：
 * - 代码块（```...```）+2 分；行内代码（`...`）+1 分
 * - 典型保留字（import/export/const/...）+2 分
 * - 箭头函数样式（=>）+1 分；点访问（foo.bar）+1 分
 * - 若包含较多括号/分号等（累计≥3 个），+1 分
 * 只要得分 ≥2 判定为“看起来像代码”。
 */
function looksLikeCode(text: string): boolean {
  if (!text) return false
  let score = 0
  if (/```[\s\S]*?```/.test(text)) score += 2
  if (/`[^`]+`/.test(text)) score += 1
  if (/\b(import|export|const|let|var|function|interface|class|return|new)\b/.test(text)) score += 2
  if (/\w+\s*=>/.test(text)) score += 1
  if (/\w+\.\w+/.test(text)) score += 1
  const punctCount = (text.match(/[{}();\[\]]/g) || []).length
  if (punctCount >= 3) score += 1
  return score >= 2
}

/**
 * 基于正文生成本地摘要（无 API 时的兜底）。
 * 仅使用正文的纯文本信息，避免标题/代码等干扰，保证单段约200字。
 */
function localGenerateSummary(title: string, body: string, maxLen = SUMMARY_MAX_LEN): string {
  // 初步清洗正文，得到纯文本
  let clean = stripAstroAndMDXComponents(body)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/^[ \t]*#{1,6}[^\n]*\n/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[ \t]*[-*+]\s+/gm, '')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!clean) {
    // 若正文清洗后为空，则用标题作简介
    return toDeclarativeSentence(title || '本文介绍相关主题与步骤。', maxLen)
  }
  return toDeclarativeSentence(clean, maxLen)
}

/**
 * 将任意纯文本整形成“单句、约200字”的陈述句摘要。
 * 处理规范：
 * - 统一中英文标点（.,!? -> 。！？）；移除不必要符号（引号、括号、斜杠、竖线、冒号、分号等）
 * - 按句子边界切分，将多句以“，”连接为一整句，结尾强制“。”
 * - 最终长度不超过 maxLen，若超出则在句末前截断；确保不以顿号/逗号等结束
 */
function toDeclarativeSentence(text: string, maxLen = SUMMARY_MAX_LEN): string {
  let s = String(text)
  // 统一中英文标点到中文风格
  s = s
    .replace(/[\.;]{1,}/g, '。')
    .replace(/[!?]+/g, '！')
    .replace(/[,，]+/g, '，')
    .replace(/[:：]+/g, '：')
    .replace(/[;；]+/g, '；')

  // 移除不适合摘要的符号（保持数字与中文）
  s = s
    .replace(/["'`~^_*@#$%&+=<>]/g, '')
    .replace(/[\(\)\[\]\{\}（ ）【 】]/g, '')
    .replace(/[|\\/]/g, '')

  // 多句合并为单句（句末标点替换为逗号，最后保留为句号）
  const parts = s
    .split(/[。！？!？…]+/)
    .map(t => t.trim())
    .filter(Boolean)
  let merged = parts.join('，')

  // 清理多余空白与重复逗号
  merged = merged.replace(/\s{2,}/g, ' ').replace(/，{2,}/g, '，').trim()
  // 截断到目标长度-1（为结尾句号预留1字符）
  const coreMax = Math.max(1, maxLen - 1)
  if (merged.length > coreMax) {
    merged = merged.slice(0, coreMax)
    // 避免以逗号/顿号/冒号/分号结尾
    merged = merged.replace(/[，、：；]+$/g, '')
  } else {
    // 长度不足时，去除末尾非句号标点
    merged = merged.replace(/[，、：；]+$/g, '')
  }
  // 结尾强制句号
  return merged.endsWith('。') ? merged : merged + '。'
}


/**
 * 在 frontmatter 中写入/更新 `summary` 字段
 * 要求：summary 出现在两个 `---` 之间的最后一行（结束分隔线之前）。
 * 若已存在则移除原位置，统一追加到结束分隔线前；若无 frontmatter 则只写入 summary。
 * @param frontmatter 原始 frontmatter 字符串（包含分隔线）
 * @param summary 需要写入的摘要文本（已为单句、长度受控）
 * @returns 更新后的 frontmatter 字符串（确保结束分隔线后带换行）
 */
function upsertSummaryInFrontmatter(frontmatter: string, summary: string): string {
  if (!frontmatter) {
    return `---\nsummary: ${escapeYaml(summary)}\n---\n`
  }

  const lines = frontmatter.split('\n')
  let endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (endIdx === -1) endIdx = lines.length

  // 过滤 frontmatter 内非 YAML 内容（如错误写入的代码块或纯文本）
  const bodyLines = lines
    .slice(1, endIdx)
    .filter(l => {
      if (/^\s*summary\s*:/i.test(l)) return false
      if (/^\s*```/.test(l)) return false
      const yamlKey = /^\s*[A-Za-z_][\w-]*\s*:/
      const yamlListItem = /^\s*-\s+.+/
      const yamlComment = /^\s*#/
      const empty = /^\s*$/
      return yamlKey.test(l) || yamlListItem.test(l) || yamlComment.test(l) || empty.test(l)
    })
  const rebuilt = [
    '---',
    ...bodyLines,
    `summary: ${escapeYaml(summary)}`,
    '---'
  ]
  // 保证结束分隔线后有一个换行，以便与正文分隔
  const fmStr = rebuilt.join('\n')
  return fmStr.endsWith('\n') ? fmStr : fmStr + '\n'
}


/**
 * 简易 YAML 转义（单行文本）
 * @param text 需要转义的摘要文本
 * @returns 适配 YAML 的安全字符串（使用双引号包裹）
 */
function escapeYaml(text: string): string {
  const s = (text || '').replace(/"/g, '\\"')
  // 使用引号以防特殊字符
  return '"' + s + '"'
}

/**
 * 基于正文生成简易摘要（本地 fallback）

function localFallbackSummary(title: string, body: string): string {
  const clean = body
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ') // 压缩空白
    .trim()
  const maxLen = 280
  const slice = clean.slice(0, maxLen)
  return slice.length < clean.length ? slice + '…' : slice || title
}
 */

/**
 * 调用外部 API 生成摘要；优先读取 custom.ts 注释配置，其次读取环境变量。
 * 当密钥包含非 ASCII 字符时，不使用 Authorization 头，改为在 JSON 体中传递 apiKey 字段，规避 ByteString 错误。
 */
async function callSummaryAPI(title: string, body: string, limit: number): Promise<string | null> {
  const cfg = readAIConfigFromCustom()
  const api = cfg.api || process.env.AI_SUMMARY_API
  const key = cfg.key || process.env.AI_SUMMARY_KEY
  if (!api) return null
  const limited = limitBody(body, limit)
  const payload: Record<string, unknown> = { title, content: limited, wordLimit: limit }
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (key) {
    if (isASCII(key)) {
      headers['Authorization'] = 'Bearer ' + key
    } else {
      // 非 ASCII 密钥：在请求体中传递，避免 ByteString 报错
      payload['apiKey'] = key
    }
  }

  try {
    const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify(payload) })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    // 约定返回 { summary: string }
    return typeof (data as any).summary === 'string' ? (data as any).summary.trim() : null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log(0, 'AI 摘要 API 调用失败：' + msg)
    return null
  }
}

/**
 * 从 frontmatter 中读取标题（用于提示词与兜底处理）
 */
function readTitleFromFrontmatter(frontmatter: string): string {
  const m = frontmatter.match(/\ntitle:\s*['\"]?([^'\"]+)['\"]?\s*\n/)
  return m ? m[1].trim() : ''
}

/**
 * 主流程：扫描文章、生成摘要并写入文件。
 * 规则：若 src/plugins/custom.ts 未声明 AI_SUMMARY_API，则保持 summary 为空值
 * 否则尝试调用 API，失败时使用本地兜底摘要。
 */
async function run(): Promise<void> {
  // 初始化日志与并发参数
  currentLogLevel = getLogLevel()
  log(1, `日志等级已设置为 ${currentLogLevel}（${currentLogLevel === 0 ? '错误' : currentLogLevel === 1 ? '信息' : '调试'}）`)
  let concurrency = getConcurrency()
  const cleanBeforeAPI = getCleanBeforeAPI()
  const isInteractive = !!process.stdin.isTTY && !!process.stdout.isTTY
  const overwritePolicy = getOverwritePolicy(isInteractive)

  const files = findMarkdownEntries(BLOG_DIR)
  if (!files.length) {
    log(1, '未找到任何 Markdown 文章。')
    return
  }
  const wordLimit = getWordLimit()
  const cfg = readAIConfigFromCustom()
  const hasCustomAPI = !!(cfg.api || process.env.AI_SUMMARY_API)

  // 调试说明：脚本仅处理 blog 目录的文章，不处理页面文件
  log(2, `跳过页面，仅处理文章目录：${BLOG_DIR}`)
  log(1, `待处理文章数：${files.length}，字数限制：${wordLimit}，并发：${concurrency}`)
  log(2, `提交给 API 的内容清洗开关：${cleanBeforeAPI ? 'true' : 'false'}`)
  log(2, `已有摘要覆盖策略：${overwritePolicy}`)

  // 若采取逐篇询问策略，避免并发导致交互混乱，降至 1
  if (overwritePolicy === 'ask' && concurrency > 1) {
    log(1, `交互式覆盖策略启用：并发由 ${concurrency} 调整为 1 以便逐篇确认`)
    concurrency = 1
  }

  /**
   * 处理单个 Markdown 文件：生成摘要并写入 frontmatter
   * @param file 文章路径
   * @param limit 最大字数限制（用于正文裁剪与 API 提交）
   */
  async function processOne(file: string, limit: number): Promise<void> {
    try {
      const content = fs.readFileSync(file, 'utf8')
      const { frontmatter, body } = splitFrontmatterAndBody(content)
      const bodyOnly = extractBodyOnly(content)
      const title = readTitleFromFrontmatter(frontmatter)
      const limitedBody = limitBody(bodyOnly, limit)

      // 已有摘要时，按策略处理是否覆盖
      if (hasSummaryInFrontmatter(frontmatter)) {
        const existing = readSummaryFromFrontmatter(frontmatter)
        if (overwritePolicy === 'never') {
          log(1, `跳过已有摘要：${path.relative(ROOT, file)}（预览：${previewText(existing, 80)}）`)
          return
        }
        if (overwritePolicy === 'ask') {
          const q = `文件已含摘要，是否覆盖？${path.relative(ROOT, file)}\n当前摘要预览：${previewText(existing, 80)}\n>`
          const yes = await promptYesNo(q, false)
          if (!yes) {
            log(1, `用户选择跳过覆盖：${path.relative(ROOT, file)}`)
            return
          }
          log(1, `用户选择覆盖已有摘要：${path.relative(ROOT, file)}`)
        }
        // always：直接覆盖，不提示
      }

      if (bodyOnly.length > limitedBody.length) {
        log(1, `正文超长，已裁剪到 ${limit} 字：${path.relative(ROOT, file)}`)
      }

      // 生成摘要：优先 API；无/失败则本地规则
      const contentForAPI = cleanBeforeAPI ? sanitizeBodyForAPI(limitedBody) : limitedBody
      if (cleanBeforeAPI) {
        log(2, `正文已清洗后提交 API：${path.relative(ROOT, file)}`)
      }
      log(2, `API 仅提交正文（忽略 frontmatter）：${path.relative(ROOT, file)}`)
      // 预览提交给 API 的正文片段，确认不包含 frontmatter
      log(2, `API 提交文本预览（前 120 字）：${previewText(contentForAPI, 120)}`)
      const apiSummary = hasCustomAPI ? await callSummaryAPI(title, contentForAPI, limit) : null
      let summaryRaw = apiSummary ?? ''
      let summary = sanitizeSummaryText(summaryRaw, SUMMARY_MAX_LEN)
      if (!summary || looksLikeCode(summary)) {
        log(1, `API 失败或内容不适合摘要，使用本地规则：${path.relative(ROOT, file)}`)
        summary = localGenerateSummary(title, limitedBody, SUMMARY_MAX_LEN)
      } else {
        log(1, `摘要生成成功（API）：${path.relative(ROOT, file)}`)
      }
      // 统一为单句陈述句
      summary = toDeclarativeSentence(summary, SUMMARY_MAX_LEN)

      const nextFrontmatter = upsertSummaryInFrontmatter(frontmatter, summary)
      const nextContent = nextFrontmatter + body
      fs.writeFileSync(file, nextContent, 'utf8')
      log(1, '已写入摘要：' + path.relative(ROOT, file))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log(0, `处理失败：${path.relative(ROOT, file)} - ${msg}`)
    }
  }

  // 并发执行任务（限定 1~5）
  const queue = files.slice()
  async function worker() {
    while (queue.length) {
      const f = queue.shift()!
      await processOne(f, wordLimit)
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
}

run().catch((e) => {
  console.error('摘要生成脚本执行失败：', e)
  process.exitCode = 1
})