var currentDomain = window.location.hostname

if (currentDomain.includes('blog.ljx.icu')) {
  var script = document.createElement('script')
  script.src = 'https://umami.ljx.icu/script.js'
  script.setAttribute('data-website-id', 'ad11c7a4-dbb8-42ff-8f60-7c225d9e9ffd')
  script.async = true
  document.head.appendChild(script)
  console.log('========成功加载 [Umami] 统计分析工具代码========')
} else if (currentDomain.includes('[站点2]')) {
  var script = document.createElement('script')
  script.src = 'https://你的站点/script.js'
  script.setAttribute('data-website-id', '[站点2的网站ID]')
  script.async = true
  document.head.appendChild(script)
  console.log('========成功加载 [站点2] 统计分析工具代码========')
} else {
  // 本地调试不需要统计
  console.log('========当前网站不需要加载统计分析工具========')
}
