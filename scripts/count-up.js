/**
 * CountUp — shared count-up animation utilities.
 * Loaded globally via BaseLayout.astro.
 * Usage: CountUp.animate(el, target, duration)
 */
;(function () {
  'use strict'

  /**
   * Parse a locale-formatted number string (e.g. "1,234" or "5.2k") to integer.
   */
  function parseCount(text) {
    if (!text) return NaN
    text = text.trim()
    // Handle "1.2k" style suffixes
    const kilo = text.match(/^([\d,.]+)k$/i)
    if (kilo) return Math.round(parseFloat(kilo[1].replace(/,/g, '')) * 1000)
    return parseInt(text.replace(/[,，]/g, ''), 10)
  }

  /**
   * Animate an element from 0 to `target` using easeOutCubic.
   * @param {HTMLElement} el
   * @param {number} target
   * @param {number} [duration=1200] ms
   */
  function animate(el, target, duration) {
    duration = duration || 1200
    var startTime = performance.now()
    function tick(now) {
      var elapsed = now - startTime
      var progress = Math.min(elapsed / duration, 1)
      // easeOutCubic: f(t) = 1 - (1 - t)³
      var eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = Math.floor(target * eased).toLocaleString()
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  /**
   * Watch an element for text changes. When a numeric value appears, animate it.
   * @param {HTMLElement} el
   * @param {number} [duration=1200]
   * @returns {{ disconnect: () => void }} handle to stop watching
   */
  function watch(el, duration) {
    duration = duration || 1200

    // Already has a number? Animate immediately
    var existing = parseCount(el.textContent || '')
    if (!isNaN(existing) && existing > 0) {
      animate(el, existing, duration)
      return { disconnect: function () {} }
    }

    var observer = new MutationObserver(function () {
      var num = parseCount(el.textContent || '')
      if (!isNaN(num) && num > 0) {
        observer.disconnect()
        animate(el, num, duration)
      }
    })
    observer.observe(el, { characterData: true, childList: true, subtree: true })
    return { disconnect: function () { observer.disconnect() } }
  }

  /**
   * Watch multiple elements by their IDs. Animate each when a number appears.
   * @param {string[]} ids
   * @param {number} [duration=1200]
   */
  function watchByIds(ids, duration) {
    duration = duration || 1200
    ids.forEach(function (id) {
      var el = document.getElementById(id)
      if (el) watch(el, duration)
    })
  }

  // Expose globally
  window.CountUp = {
    animate: animate,
    parseCount: parseCount,
    watch: watch,
    watchByIds: watchByIds
  }
})()
