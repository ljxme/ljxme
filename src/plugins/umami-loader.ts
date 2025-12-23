const UMAMI_SCRIPT_SRC = 'https://umami.ljx.icu/script.js'
const UMAMI_WEBSITE_ID = 'ad11c7a4-dbb8-42ff-8f60-7c225d9e9ffd'
const UMAMI_LOG_PREFIX = '[Umami]'

function getUmamiDecision(hostname: string): { shouldLoad: boolean; reason: string } {
  if (import.meta.env.DEV) return { shouldLoad: false, reason: 'DEV 模式，跳过加载' }
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
    return { shouldLoad: false, reason: `本地地址（${hostname}），跳过加载` }
  }
  if (!hostname.includes('blog.ljx.icu')) {
    return { shouldLoad: false, reason: `域名不匹配（${hostname}），跳过加载` }
  }
  return { shouldLoad: true, reason: `域名匹配（${hostname}），准备注入脚本` }
}

function injectUmamiScript(): void {
  const hostname = window.location.hostname
  const decision = getUmamiDecision(hostname)
  console.log(`${UMAMI_LOG_PREFIX} ${decision.reason}`)
  if (!decision.shouldLoad) return

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${UMAMI_SCRIPT_SRC}"][data-website-id="${UMAMI_WEBSITE_ID}"]`
  )
  if (existing) {
    console.log(`${UMAMI_LOG_PREFIX} 已存在脚本，跳过重复注入`)
    return
  }

  const script = document.createElement('script')
  script.src = UMAMI_SCRIPT_SRC
  script.async = true
  script.dataset.websiteId = UMAMI_WEBSITE_ID
  document.head.appendChild(script)
  console.log(`${UMAMI_LOG_PREFIX} 已注入脚本：${UMAMI_SCRIPT_SRC}`)
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  injectUmamiScript()
}

export {}
