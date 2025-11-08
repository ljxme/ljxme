/**
 * AISummary 配置文件
 * 说明：本文件作为普通脚本注入页面（非模块），使用 var 保持全局可见
 */

// AI 摘要脚本配置（供离线脚本读取）：
// [AI_SUMMARY_API] 摘要服务地址
// AI_SUMMARY_API=https://aisummary.ljx.icu/api/spark-proxy

// [AI_SUMMARY_KEY] 摘要服务密钥
// AI_SUMMARY_KEY=your-api-key

// [AISUMMARY_WORD_LIMIT] 提交与处理的最大字数
// AISUMMARY_WORD_LIMIT=8000

// [AISUMMARY_LOG_LEVEL] 运行日志等级
// 0：仅错误（只输出失败与异常），不显示任何生成或处理信息
// 1：信息级（输出正文裁剪、API 成功/失败、本地兜底与写入完成等）
// 2：调试级（在 1 的基础上，额外输出处理范围与统计，如“跳过页面，仅处理文章目录”）
// AISUMMARY_LOG_LEVEL=2

// [AISUMMARY_CONCURRENCY] 并发处理数
// 并发执行文章摘要生成任务（默认值：3；建议不高于 5，以避免 API 限流与本地资源过载）
// AISUMMARY_CONCURRENCY=2

// [AISUMMARY_CLEAN_BEFORE_API] 是否清洗提交给摘要服务的正文
// 作用：调用 API 前去除 Markdown/代码块/HTML，仅保留纯文本；若服务希望原始 Markdown，请设为 false
// AISUMMARY_CLEAN_BEFORE_API=true

// [AISUMMARY_OVERWRITE_EXISTING] 已有摘要的覆盖策略
// 可选：ask（逐篇询问）、always（总是覆盖）、never（从不覆盖，跳过写入）
// 说明：当文章 frontmatter 中已存在 summary 字段时，脚本按此策略处理是否重写。
// AISUMMARY_OVERWRITE_EXISTING=ask

// 说明：以上为注释形式的键值配置，供离线脚本解析，不在浏览器中使用

// AISummary 静态摘要配置：
var aisummaryTypingAnimate = true; // true 开启打字机动画；false 直接渲染文本
var aisummaryPostSelector = '#content'; // 文章内容容器选择器，例如 #article-container, .post-content