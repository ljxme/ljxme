import fs from 'node:fs/promises'
import path from 'node:path'
import pLimit from 'p-limit'

import links from '../public/links.json' with { type: 'json' }

const DATA_PATH = path.resolve('public/links.json')
const CHECK_TIMEOUT = 15000
const PLimit_NUM = 5
const MAX_RETRIES = 3
const RETRY_DELAY = 1000
const SKIP_CHECK_NAMES = [""]

interface FriendLink {
  name: string
  link: string
  responseTime?: number
}

interface FriendGroup {
  id_name: 'cf-links' | 'inactive-links' | 'special-links'
  link_list: FriendLink[]
}

interface FriendLinksConfig {
  friends: FriendGroup[]
}

type LinkStatus = 'ok' | 'timeout' | 'error'

interface LinkCheckResult {
  name: string
  link: string
  status?: LinkStatus
  httpStatus?: number
  responseTime?: number
  reason?: string
}

async function fetchLink(url: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT)

  try {
    const start = Date.now()
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 FriendLinkChecker/1.0' }
    })
    const time = Date.now() - start

    return {
      ok: res.ok,
      status: res.status,
      time,
    }
  } finally {
    clearTimeout(timer)
  }
}

const ENV_SKIP_NAMES = process.env.SKIP_CHECK_NAMES?.split(',') || []
const SKIP_NAMES = new Set((SKIP_CHECK_NAMES).concat(ENV_SKIP_NAMES).map(s => s.trim()).filter(Boolean))
async function checkLink(link: FriendLink): Promise<LinkCheckResult> {
  if ( SKIP_NAMES.has(link.name)) {
    console.log(`[Check-Links] ${link.name} (${link.link}) skipped 🧹`)
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
      const res = await fetchLink(link.link)
      console.log(`[Check-Links] ${link.name} responded in ${res.time}ms ✨`)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

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
        const delay = RETRY_DELAY * 2 ** i + Math.floor(Math.random() * 100)
        console.warn(
          `[Check-Links] Retry attempt (${i + 1}/${MAX_RETRIES}) for ${link.name} after ${delay}ms due to: ${lastError.message} 😭`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
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
    .filter((g) => g.id_name === 'cf-links')
    .flatMap((group) => group.link_list.map((link) => limit(() => checkLink(link))))

  const results = await Promise.allSettled(tasks)

  const linkMap = new Map<string, LinkCheckResult>()
  
  for (const r of results) {
    if (r.status === 'fulfilled') {
      linkMap.set(r.value.link, r.value)
    } else {
      console.error(`[Check-Links] Unexpected error (${r.reason}) 🤔`)
    }
  }
  for (const group of config.friends) {
    for (const link of group.link_list) {
      const res = linkMap.get(link.link)
      if (res) {
        link.responseTime = res.responseTime ?? 0
      }
    }
  }

  await fs.writeFile(DATA_PATH, JSON.stringify(config, null, 2))

  const failed = Array.from(linkMap.values()).filter(r => r.status !== 'ok')
  if (failed.length > 0) {
    console.error(
      `[Check-Links] Friend link check failed (${failed.length} inactive links checked) 😡:`
    )
    for (const f of failed) {
      console.error(
        `[Check-Links] - ${f.name} (${f.link}) => ${f.status}`,
        f.reason ? ` | ${f.reason}` : ''
      )
    }
    process.exit(1)
  }

  console.log(
    `[Check-Links] All links are healthy and responseTime updated (${results.length} links checked) 😋`
  )
}

main()
