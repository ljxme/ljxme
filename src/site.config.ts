import type { CardListData, Config, IntegrationUserConfig,ThemeUserConfig } from 'astro-pure/types'

export const theme: ThemeUserConfig = {
  // === Basic configuration ===
  /** Title for your website. Will be used in metadata and as browser tab title. */
  title: "梨尽兴 | Li's Blog",
  /** Will be used in index page & copyright declaration */
  author: 'Ljx',
  /** Description metadata for your website. Can be used in page metadata. */
  description: 'A place for peace',
  /** The default favicon for your site which should be a path to an image in the `public/` directory. */
  favicon: '/favicon/favicon.ico',
  /** Specify the default language for this site. */
  locale: {
    lang: 'zh-CN',
    attrs: 'zh-CN',
    // Date locale
    dateLocale: 'en-US',
    dateOptions: {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }
  },
  /** Set a logo image to show in the homepage. */
  logo: {
    src: 'src/assets/avatar.webp',
    alt: 'Avatar'
  },

  // === Global configuration ===
  titleDelimiter: '·',
  prerender: true,
  npmCDN: 'https://cdn.jsdmirror.com/npm',

  // Still in test
  head: [
    /* Telegram channel */
    // {
    //   tag: 'meta',
    //   attrs: { name: 'telegram:channel', content: '@cworld0_cn' },
    //   content: ''
    // }
  ],
  customCss: [],

  /** Configure the header of your site. */
  header: {
    menu: [
      { title: '文章', link: '/blog' },
    //  { title: '文档', link: '/docs' },
      { title: '项目', link: '/projects' },
      { title: '友链', link: '/links' },
      { title: '留言', link: '/board' },
      { title: '关于', link: '/about' }
    ]
  },

  /** Configure the footer of your site. */
  footer: {
    // Year format
    year: `© ${new Date().getFullYear()}`,
    // year: `© 2019 - ${new Date().getFullYear()}`,
    links: [
      // Registration link
      {
        title: '鄂ICP备2025150801号-1',
        link: 'https://beian.miit.gov.cn/',
        style: 'text-sm', // Uno/TW CSS class
      },
      {
        title: '川公网安备51170302000216号',
        link: 'https://beian.mps.gov.cn/#/query/webSearch?code=51170302000216',
        style: 'text-sm',
      },
      {
        title: 'Travelling',
        link: 'https://www.travellings.cn/go.html',
        style: 'text-sm'
      },
      // Privacy Policy link
      {
        title: 'Site Policy',
        link: '/terms/list',
        pos: 2 // position set to 2 will be appended to copyright line
      }
    ],
    /** Enable displaying a “Astro & Pure theme powered” link in your site’s footer. */
    credits: true,
    /** Optional details about the social media accounts for this site. */
    social: { 
      email: 'mailto:me@ljx.icu', 
      github: 'https://github.com/ljxme',
      telegram: 'https://t.me/ljxme'
    }
  },

  content: {
    /** External links configuration */
    externalLinks: {
      content: ' ↗',
      /** Properties for the external links element */
      properties: {
        style: 'user-select:none'
      }
    },
    /** Blog page size for pagination (optional) */
    blogPageSize: 8,
    // Currently support weibo, x, bluesky
    share: ['weibo', 'x', 'bluesky']
  }
}

export const integ: IntegrationUserConfig = {
  // Links management
  // See: https://astro-pure.js.org/docs/integrations/links
  links: {
    // Friend logbook
    logbook: [
      { date: '2025-10-30', content: " [AirTouchの小站] rejected, [Shuoer's blog] inactived" },
      { date: '2025-10-22', content: " [青序栈] rejected" },
      { date: '2025-10-17', content: " [清羽飞扬] added" },
      { date: '2025-10-10', content: " [Shuoer's blog] added" },
      { date: '2025-10-09', content: " [温锦瑜的博客]、[Chancel's blog]、[FKUN]、[Zeruns's Blog] added" }
    ],
    // Yourself link info
    applyTip: [
      { name: 'Name', val: "梨尽兴" },
      { name: 'Desc', val: theme.description || 'Null' },
      { name: 'Link', val: 'https://blog.ljx.icu' },
      { name: 'Rss', val: 'https://blog.ljx.icu/rss.xml' },
      { name: 'Avatar', val: 'https://blog.ljx.icu/favicon.png' },
    ]
  },
  // Enable page search function
  pagefind: true,
  // Add a random quote to the footer (default on homepage footer)
  // See: https://astro-pure.js.org/docs/integrations/advanced#web-content-render
  quote: {
    // https://developer.hitokoto.cn/sentence/#%E8%AF%B7%E6%B1%82%E5%9C%B0%E5%9D%80
    // server: 'https://v1.hitokoto.cn/?c=i',
    // target: (data) => (data as { hitokoto: string }).hitokoto || 'Error'
    // https://github.com/lukePeavey/quotable
    server: 'https://v1.hitokoto.cn/?c=i', 
    target: `(data) => data.hitokoto || 'Error'`
  },
  // UnoCSS typography
  // See: https://unocss.dev/presets/typography
  typography: {
    class: 'prose text-base',
    // The style of blockquote font, normal or italic (default to italic in typography)
    blockquoteStyle: 'italic',
    // The style of inline code block, code or modern (default to code in typography)
    inlineCodeBlockStyle: 'modern'
  },
  // A lightbox library that can add zoom effect
  // See: https://astro-pure.js.org/docs/integrations/others#medium-zoom
  mediumZoom: {
    enable: true, // disable it will not load the whole library
    selector: '.prose .zoomable',
    options: {
      className: 'zoomable'
    }
  },
  // Comment system
  waline: {
    enable: true,
    // Server service link
    server: 'https://waline.ljx.icu/',
    // Refer https://waline.js.org/en/guide/features/emoji.html
    emoji: ['bmoji',"ljxme","heybox_cube","heybox_heniang","linedog"],
    // Refer https://waline.js.org/en/reference/client/props.html
    additionalConfigs: {
      // search: false,
      pageview: true,
      comment: true,
      locale: {
        reaction0: 'Like',
        placeholder: '欢迎留下评论~（无需登录，评论经审核后可见）'
      },
      // imageUploader: false
    }
  }
}

export const terms: CardListData = {
  title: 'Terms content',
  list: [
    {
      title: '隐私政策',
      link: '/terms/privacy-policy'
    },
    {
      title: '服务条款',
      link: '/terms/terms-and-conditions'
    },
    {
      title: '版权声明',
      link: '/terms/copyright'
    },
    {
      title: '免责声明',
      link: '/terms/disclaimer'
    }
  ]
}

const config = { ...theme, integ } as Config
export default config
