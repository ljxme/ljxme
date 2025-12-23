const currentDomain: string = window.location.hostname

if (currentDomain.includes('[站点1]')) {
  const script: HTMLScriptElement = document.createElement('script')

  script.src = 'https://umami.ljx.icu/script.js'
  script.dataset.websiteId = 'ad11c7a4-dbb8-42ff-8f60-7c225d9e9ffd'
  script.async = true

  document.head.appendChild(script)

  console.log('========成功加载 [Umami] 统计分析工具代码========')
} else {
  console.log('========当前网站不需要加载统计分析工具========')
}

export {}
