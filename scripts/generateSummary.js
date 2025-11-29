import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// 加载配置
const CONFIG_PATH = path.resolve('src/plugins/aisummary.config.js')
const CONFIG = fs.existsSync(CONFIG_PATH)
  ? (await import(pathToFileURL(CONFIG_PATH).href)).default
  : {}
const API_URL = CONFIG.AI_SUMMARY_API || ''
const API_KEY = CONFIG.AI_SUMMARY_KEY || ''
const BLOG_DIR = path.resolve('src/content/blog')
const SUMMARY_FIELD = 'summary'
const MAX_LEN = CONFIG.AISUMMARY_WORD_LIMIT || 800

// Node 18+ 内置 fetch，无需 node-fetch
async function requestSummary(text) {
  if (!API_URL) return null
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {})
      },
      body: JSON.stringify({
        prompt: `请用中文为以下文章生成约200字摘要，要求自然流畅、无敏感内容：\n${text.slice(0, MAX_LEN * 2)}`
      })
    })
    const data = await res.json()
    return data?.summary || data?.text || null
  } catch (err) {
    console.error('❌ AI 摘要 API 调用失败:', err.message)
    return null
  }
}

function findEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((f) => {
    const p = path.join(dir, f.name)
    return f.isDirectory() ? findEntries(p) : /index\.mdx?$/.test(f.name) ? [p] : []
  })
}

function splitFrontmatter(content) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/m.exec(content.trimStart())
  return m ? { fm: m[1], body: m[2] } : { fm: '', body: content }
}

function sanitize(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function toSentence(s) {
  s = s.slice(0, MAX_LEN).trim()
  return /[。.!?]$/.test(s) ? s : s + '。'
}

function hasSummary(fm) {
  return new RegExp(`(^|\\n)\\s*${SUMMARY_FIELD}\\s*:`).test(fm)
}

for (const file of findEntries(BLOG_DIR)) {
  const raw = fs.readFileSync(file, 'utf8')
  const { fm, body } = splitFrontmatter(raw)
  if (hasSummary(fm)) continue

  const cleanText = sanitize(body)
  let summary = null

  if (API_URL) {
    summary = await requestSummary(cleanText)
  }
  if (!summary) {
    summary = toSentence(cleanText)
  }

  const out = `---\n${fm}\n${SUMMARY_FIELD}: "${summary.replace(/"/g, "'")}"\n---\n\n${body}`
  fs.writeFileSync(file, out)
  console.log('✅ 写入摘要:', path.relative(BLOG_DIR, file))
}

console.log('\n✨ 全部摘要生成完成。')
