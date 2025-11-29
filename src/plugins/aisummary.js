// AISummary
console.log(
  '%cAISummary v1.0.0 %c https://blog.ljx.icu/blog/aisummary-blog/',
  'color:#fff;background:linear-gradient(90deg,#ff8acb,#ff5ebc,#ff1493);padding:5px 12px;border-radius:4px 0 0 4px;',
  'color:#000;background:linear-gradient(90deg,#ff1493,#ffb6c1,#fff);padding:5px 14px 5px 8px;border-radius:0 4px 4px 0;'
)

// 运行标记，防止重复动画
let aisummaryIsRunning = false

// 核心对象：仅保留静态摘要读取与动画显示
const aisummary = {
  /**
   * 获取摘要纯文本
   * @returns 优先返回 data-ai-summary 的值，否则返回元素文本
   */
  getStaticSummary() {
    const el = document.querySelector('.aisummary-explanation')
    if (!el) return ''
    const attr = el.getAttribute('data-ai-summary')
    const text = attr && attr.trim().length ? attr : (el.textContent || '').trim()
    return text || ''
  },

  /**
   * 展示摘要文本：根据开关决定是否执行打字机动画
   * @param {string} text 完整摘要文本
   */
  aiShowAnimation(text) {
    const element = document.querySelector('.aisummary-explanation')
    if (!element || !text) return
    if (aisummaryIsRunning) return

    // 不启用动画时直接渲染
    if (
      typeof window !== 'undefined' &&
      typeof window.aisummaryTypingAnimate !== 'undefined' &&
      !window.aisummaryTypingAnimate
    ) {
      element.innerHTML = text
      element.style.maxHeight = 'none'
      element.style.overflow = 'visible'
      return
    }

    aisummaryIsRunning = true
    const TYPING_DELAY = 25
    const PUNCTUATION_MULT = 6

    element.style.display = 'block'
    element.style.maxHeight = 'none'
    element.style.overflow = 'visible'
    element.innerHTML = '生成中...' + '<span class="blinking-cursor"></span>'

    let animationRunning = true
    let currentIndex = 0
    let lastUpdateTime = performance.now()
    let started = false

    const animate = () => {
      if (currentIndex < text.length && animationRunning) {
        const currentTime = performance.now()
        const timeDiff = currentTime - lastUpdateTime
        const letter = text.slice(currentIndex, currentIndex + 1)
        const isPunctuation = /[，。！、？,.!?]/.test(letter)
        const delay = isPunctuation ? TYPING_DELAY * PUNCTUATION_MULT : TYPING_DELAY

        if (timeDiff >= delay) {
          lastUpdateTime = currentTime
          currentIndex++
          if (currentIndex < text.length) {
            element.innerHTML =
              text.slice(0, currentIndex) + '<span class="blinking-cursor"></span>'
          } else {
            element.innerHTML = text
            element.style.display = 'block'
            aisummaryIsRunning = false
            observer.disconnect()
          }
        }
        requestAnimationFrame(animate)
      }
    }

    // 进入视口时才运行动画，提高性能
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0].isIntersecting
        animationRunning = isVisible
        if (animationRunning && !started) {
          started = true
          setTimeout(() => requestAnimationFrame(animate), 200)
        }
      },
      { threshold: 0 }
    )

    const container = document.querySelector('.aisummary-container')
    if (container) observer.observe(container)
  }
}

/**
 * 确保摘要容器插入到正文容器的开头位置
 */
function ensureSummaryPosition() {
  const selectorFromWindow =
    typeof window !== 'undefined' &&
    typeof window.aisummaryPostSelector === 'string' &&
    window.aisummaryPostSelector.trim().length
      ? window.aisummaryPostSelector
      : null
  const containerSelector = selectorFromWindow || '#content'
  const contentEl = document.querySelector(containerSelector)
  const summaryEl = document.querySelector('.aisummary-container')
  if (!contentEl || !summaryEl) return
  if (!contentEl.contains(summaryEl)) {
    contentEl.insertBefore(summaryEl, contentEl.firstChild)
  }
}

/**
 * 初始化 AISummary：读取静态摘要并渲染（或执行动画）
 */
function initializeAISummary() {
  const summaryEl = document.querySelector('.aisummary-explanation')
  if (!summaryEl) return
  ensureSummaryPosition()
  const summary = aisummary.getStaticSummary()
  if (!summary) return
  aisummary.aiShowAnimation(summary)
}

/**
 * 保证在各种加载时机下都能触发初始化
 * - 若文档仍在解析（readyState === 'loading'），监听 DOMContentLoaded
 * - 若文档已解析完成，立即执行初始化
 * - 为避免重复绑定，先移除旧的 DOMContentLoaded 监听器
 */
;(function ensureInit() {
  document.removeEventListener('DOMContentLoaded', initializeAISummary)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAISummary)
  } else {
    initializeAISummary()
  }
})()
