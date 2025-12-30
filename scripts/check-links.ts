import fs from 'node:fs/promises'
import path from 'node:path'
import pLimit from 'p-limit'

import links from '../public/links.json' with { type: 'json' }

const DATA_PATH = path.resolve('public/links.json')
const MY_SITE = 'https://blog.ljx.me'
const CHECK_TIMEOUT = 15000
const PLimit_NUM = 5
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

interface FriendLink {
  name: string
  link: string
  friends_page?: string
  skip_check?: boolean
  responseTime?: number
}

interface FriendGroup {
  id_name: 'cf-links' | 'inactive-links' | 'special-links'
  link_list: FriendLink[]
}

interface FriendLinksConfig {
  friends: FriendGroup[]
}

type LinkStatus = 'ok' | 'timeout' | 'http-error' | 'no-backlink' | 'blocked' | 'error'

interface LinkCheckResult {
  name: string
  link: string
  status: LinkStatus
  httpStatus?: number
  responseTime?: number
  reason?: string
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT)

  try {
    const start = Date.now()
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 FriendLinkChecker/1.0' }
    })
    const time = Date.now() - start

    return {
      ok: res.ok,
      status: res.status,
      time,
      text: () => res.text()
    }
  } finally {
    clearTimeout(timer)
  }
}

async function checkLink(link: FriendLink): Promise<LinkCheckResult> {
  if (link.skip_check) {
    return {
      name: link.name,
      link: link.link,
      status: 'ok',
      reason: 'skip_check',
      responseTime: 0
    }
  }

  let lastError: Error | null = null

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await fetchWithTimeout(link.link)
      console.log(`[Check-Links] ${link.name} responded in ${res.time}ms ✨`)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      if (link.friends_page) {
        const page = await fetchWithTimeout(link.friends_page)
        const html = await page.text()
        if (!html.includes(MY_SITE)) throw new Error('No backlink found')
      }

      return {
        name: link.name,
        link: link.link,
        status: 'ok',
        httpStatus: res.status,
        responseTime: res.time
      }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (i < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY * 2 ** i
        console.warn(`[Check-Links] Retry ${i + 1} for ${link.name} after ${delay}ms due to: ${lastError.message} 😭`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  return {
    name: link.name,
    link: link.link,
    status: lastError?.name === 'AbortError' ? 'timeout' : 'error',
    reason: lastError?.message,
    responseTime: 0
  }
}

async function main() {
  console.log('[Check-Links] Start checking friend links... ❤️')

  const config = links as FriendLinksConfig
  const limit = pLimit(PLimit_NUM)

  const tasks = config.friends
    .filter(g => g.id_name === 'cf-links')
    .flatMap(group => group.link_list.map(link => limit(() => checkLink(link))))

  const results = await Promise.all(tasks)

  for (const group of config.friends) {
    for (const link of group.link_list) {
      const res = results.find(r => r.link === link.link)
      if (res) link.responseTime = res.responseTime ?? 0
    }
  }

  await fs.writeFile(DATA_PATH, JSON.stringify(config, null, 2))

  const failed = results.filter(r => r.status !== 'ok')
  if (failed.length > 0) {
    console.error(`[Check-Links] Friend link check failed (${failed.length} inactive links checked) 😡:`)
    for (const f of failed) {
      console.error(`[Check-Links] - ${f.name} (${f.link}) => ${f.status}`, f.reason ? ` | ${f.reason}` : '')
    }
    process.exit(1)
  }

  console.log(`[Check-Links] All links are healthy and responseTime updated (${results.length} links checked) 😋`)
}

main()
