var currentDomain = window.location.hostname;

if (currentDomain.includes('[站点1]')) {
    var script = document.createElement('script');
    script.src = 'https://[你的站点]/script.js'; // 这个需要你自己看着改改
    script.setAttribute('data-website-id', '[站点1的网站ID，也就是跟踪代码后面一串]');
    script.async = true; // 将script的async属性设置为true，实现异步加载
    document.head.appendChild(script);
    console.log('========成功加载 [站点1] 统计分析工具代码========');
} else if (currentDomain.includes('[站点2]')) {
    var script = document.createElement('script');
    script.src = 'https://你的站点/script.js';
    script.setAttribute('data-website-id', '[站点2的网站ID]');
    script.async = true; // 将script的async属性设置为true，实现异步加载
    document.head.appendChild(script);
    console.log('========成功加载 [站点2] 统计分析工具代码========');
} else { // 比如本地调试，就不需要统计了，要不然会发现统计页面很多来自本地localhost
    console.log('========当前网站不需要加载统计分析工具========');
}
