/* eslint-disable */
function renderTalks() {
    const talkContainer = document.querySelector('#talk');
    if (!talkContainer) return;
    talkContainer.innerHTML = '';
    const generateIconSVG = () => {
        return `<svg viewBox="0 0 512 512"xmlns="http://www.w3.org/2000/svg"class="is-badge icon"><path d="m512 268c0 17.9-4.3 34.5-12.9 49.7s-20.1 27.1-34.6 35.4c.4 2.7.6 6.9.6 12.6 0 27.1-9.1 50.1-27.1 69.1-18.1 19.1-39.9 28.6-65.4 28.6-11.4 0-22.3-2.1-32.6-6.3-8 16.4-19.5 29.6-34.6 39.7-15 10.2-31.5 15.2-49.4 15.2-18.3 0-34.9-4.9-49.7-14.9-14.9-9.9-26.3-23.2-34.3-40-10.3 4.2-21.1 6.3-32.6 6.3-25.5 0-47.4-9.5-65.7-28.6-18.3-19-27.4-42.1-27.4-69.1 0-3 .4-7.2 1.1-12.6-14.5-8.4-26-20.2-34.6-35.4-8.5-15.2-12.8-31.8-12.8-49.7 0-19 4.8-36.5 14.3-52.3s22.3-27.5 38.3-35.1c-4.2-11.4-6.3-22.9-6.3-34.3 0-27 9.1-50.1 27.4-69.1s40.2-28.6 65.7-28.6c11.4 0 22.3 2.1 32.6 6.3 8-16.4 19.5-29.6 34.6-39.7 15-10.1 31.5-15.2 49.4-15.2s34.4 5.1 49.4 15.1c15 10.1 26.6 23.3 34.6 39.7 10.3-4.2 21.1-6.3 32.6-6.3 25.5 0 47.3 9.5 65.4 28.6s27.1 42.1 27.1 69.1c0 12.6-1.9 24-5.7 34.3 16 7.6 28.8 19.3 38.3 35.1 9.5 15.9 14.3 33.4 14.3 52.4zm-266.9 77.1 105.7-158.3c2.7-4.2 3.5-8.8 2.6-13.7-1-4.9-3.5-8.8-7.7-11.4-4.2-2.7-8.8-3.6-13.7-2.9-5 .8-9 3.2-12 7.4l-93.1 140-42.9-42.8c-3.8-3.8-8.2-5.6-13.1-5.4-5 .2-9.3 2-13.1 5.4-3.4 3.4-5.1 7.7-5.1 12.9 0 5.1 1.7 9.4 5.1 12.9l58.9 58.9 2.9 2.3c3.4 2.3 6.9 3.4 10.3 3.4 6.7-.1 11.8-2.9 15.2-8.7z"fill="#1da1f2"></path></svg>`;
    }
    const waterfall = (a) => {
        function b(a, b) {
            var c = window.getComputedStyle(b);
            return parseFloat(c["margin" + a]) || 0
        }

        function c(a) {
            return a + "px"
        }

        function d(a) {
            return parseFloat(a.style.top)
        }

        function e(a) {
            return parseFloat(a.style.left)
        }

        function f(a) {
            return a.clientWidth
        }

        function g(a) {
            return a.clientHeight
        }

        function h(a) {
            return d(a) + g(a) + b("Bottom", a)
        }

        function i(a) {
            return e(a) + f(a) + b("Right", a)
        }

        function j(a) {
            a = a.sort(function (a, b) {
                return h(a) === h(b) ? e(b) - e(a) : h(b) - h(a)
            })
        }

        function k(b) {
            f(a) != t && (b.target.removeEventListener(b.type, arguments.callee), waterfall(a))
        }
        "string" == typeof a && (a = document.querySelector(a));
        var l = [].map.call(a.children, function (a) {
            return a.style.position = "absolute", a
        });
        a.style.position = "relative";
        var m = [];
        l.length && (l[0].style.top = "0px", l[0].style.left = c(b("Left", l[0])), m.push(l[0]));
        for (var n = 1; n < l.length; n++) {
            var o = l[n - 1],
                p = l[n],
                q = i(o) + f(p) <= f(a);
            if (!q) break;
            p.style.top = o.style.top, p.style.left = c(i(o) + b("Left", p)), m.push(p)
        }
        for (; n < l.length; n++) {
            j(m);
            var p = l[n],
                r = m.pop();
            p.style.top = c(h(r) + b("Top", p)), p.style.left = c(e(r)), m.push(p)
        }
        j(m);
        var s = m[0];
        a.style.height = c(h(s) + b("Bottom", s));
        var t = f(a);
        window.addEventListener ? window.addEventListener("resize", k) : document.body.onresize = k
    };

    const fetchAndRenderTalks = () => {
        const url = 'https://mm.ljx.icu/api/memo/list';
        const cacheKey = 'talksCache';
        const cacheTimeKey = 'talksCacheTime';
        const cacheDuration = 30 * 60 * 1000; // 半个小时 (30 分钟)
    
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        const currentTime = new Date().getTime();
    
        // 判断缓存是否有效
        if (cachedData && cachedTime && (currentTime - cachedTime < cacheDuration)) {
            const data = JSON.parse(cachedData);
            renderTalks(data); // 使用缓存渲染数据
        } else {
            if (talkContainer) {
                talkContainer.innerHTML = '';
                fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            size: 30
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.code === 0 && data.data && Array.isArray(data.data.list)) {
                            // 缓存数据
                            localStorage.setItem(cacheKey, JSON.stringify(data.data.list));
                            localStorage.setItem(cacheTimeKey, currentTime.toString());
                            renderTalks(data.data.list); // 渲染数据
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching data:', error);
                    });
            }
        }
    
        // 渲染函数
        function renderTalks(list) {
            // 确保 data 是一个数组
            if (Array.isArray(list)) {
                let items = list.map(item => formatTalk(item, url));
                items.forEach(item => talkContainer.appendChild(generateTalkElement(item)));
                waterfall('#talk');
                // 应用瀑布流布局优化
                setTimeout(() => {
                    optimizeMasonryLayout();
                    addResizeListener();
                }, 100);
            } else {
                console.error('Data is not an array:', list);
            }
        }
    };
    

    const formatTalk = (item, url) => {
        let date = formatTime(new Date(item.createdAt).toString());
        let content = item.content;
        let imgs = item.imgs ? item.imgs.split(',') : [];
        let text = content;
        content = text.replace(/\[(.*?)\]\((.*?)\)/g, `<a href="$2">@$1</a>`)
            .replace(/- \[ \]/g, '⚪')
            .replace(/- \[x\]/g, '⚫');
        // 保留换行符，转换 \n 为 <br>
		content = content.replace(/\n/g, '<br>');
        // 将content用一个类包裹，便于后续处理
        content = `<div class="talk_content_text">${content}</div>`;
        if (imgs.length > 0) {
            const imgDiv = document.createElement('div');
            imgDiv.className = 'zone_imgbox';
            imgs.forEach(e => {
                const imgLink = document.createElement('a');
                imgLink.href = e;
                imgLink.setAttribute('data-fancybox', 'gallery');
                imgLink.className = 'fancybox';
                imgLink.setAttribute('data-thumb', e);
                const imgTag = document.createElement('img');
                imgTag.src = e;
                imgLink.appendChild(imgTag);
                imgDiv.appendChild(imgLink);
            });
            content += imgDiv.outerHTML;
        }

        // 外链分享功能
        if (item.externalUrl) {
            const externalUrl = item.externalUrl;
            const externalTitle = item.externalTitle;
            const externalFavicon = item.externalFavicon;

            const externalContainer = `
            <div class="shuoshuo-external-link">
                <a class="external-link" href="${externalUrl}" target="_blank" rel="external nofollow noopener noreferrer">
                    <div class="external-link-left" style="background-image: url(${externalFavicon})"></div>
                    <div class="external-link-right">
                        <div class="external-link-title">${externalTitle}</div>
                        <div>点击跳转<i class="fa-solid fa-angle-right"></i></div>
                    </div>
                </a>
            </div>`;

            content += externalContainer;
        }

        const ext = JSON.parse(item.ext || '{}');

        if (ext.music && ext.music.id) {
            const music = ext.music;
            const musicUrl = music.api.replace(':server', music.server)
                .replace(':type', music.type)
                .replace(':id', music.id);
            content += `
            <meting-js server="${music.server}" type="${music.type}" id="${music.id}" api="${music.api}"></meting-js>
        `;
        }

        if (ext.doubanMovie && ext.doubanMovie.id) {
            const doubanMovie = ext.doubanMovie;
            const doubanMovieUrl = doubanMovie.url;
            const doubanTitle = doubanMovie.title;
            // const doubanDesc = doubanMovie.desc || '暂无描述';
            const doubanImage = doubanMovie.image;
            const doubanDirector = doubanMovie.director || '未知导演';
            const doubanRating = doubanMovie.rating || '暂无评分';
            // const doubanReleaseDate = doubanMovie.releaseDate || '未知上映时间';
            // const doubanActors = doubanMovie.actors || '未知演员';
            const doubanRuntime = doubanMovie.runtime || '未知时长';

            content += `
                <a class="douban-card" href="${doubanMovieUrl}" target="_blank">
                    <div class="douban-card-bgimg" style="background-image: url('${doubanImage}');"></div>
                    <div class="douban-card-left">
                        <div class="douban-card-img" style="background-image: url('${doubanImage}');"></div>
                    </div>
                    <div class="douban-card-right">
                        <div class="douban-card-item"><span>电影名: </span><strong>${doubanTitle}</strong></div>
                        <div class="douban-card-item"><span>导演: </span><span>${doubanDirector}</span></div>
                        <div class="douban-card-item"><span>评分: </span><span>${doubanRating}</span></div>
                        <div class="douban-card-item"><span>时长: </span><span>${doubanRuntime}</span></div>
                    </div>
                </a>
            `;
        }

        if (ext.doubanBook && ext.doubanBook.id) {
            const doubanBook = ext.doubanBook;
            const bookUrl = doubanBook.url;
            const bookTitle = doubanBook.title;
            // const bookDesc = doubanBook.desc;
            const bookImage = doubanBook.image;
            const bookAuthor = doubanBook.author;
            const bookRating = doubanBook.rating;
            const bookPubDate = doubanBook.pubDate;

            const bookTemplate = `
                <a class="douban-card" href="${bookUrl}" target="_blank">
                    <div class="douban-card-bgimg" style="background-image: url('${bookImage}');"></div>
                        <div class="douban-card-left">
                            <div class="douban-card-img" style="background-image: url('${bookImage}');"></div>
                        </div>
                        <div class="douban-card-right">
                            <div class="douban-card-item">
                                <span>书名: </span><strong>${bookTitle}</strong>
                            </div>
                            <div class="douban-card-item">
                                <span>作者: </span><span>${bookAuthor}</span>
                            </div>
                            <div class="douban-card-item">
                                <span>出版年份: </span><span>${bookPubDate}</span>
                            </div>
                            <div class="douban-card-item">
                                <span>评分: </span><span>${bookRating}</span>
                            </div>
                        </div>
                </a>
            `;

            content += bookTemplate;
        }

        if (ext.video && ext.video.type) {
            const videoType = ext.video.type;
            const videoUrl = ext.video.value;
            if (videoType === 'bilibili') {
                // Bilibili 视频模板
                // 从形如https://www.bilibili.com/video/BV1VGAPeAEMQ/?vd_source=91b3158d27d98ff41f842508c3794a13 的链接中提取视频 BV1VGAPeAEMQ
                const biliTemplate = `
                <div style="position: relative; padding: 30% 45%; margin-top: 10px;">
                    <iframe 
                        style="position: absolute; width: 100%; height: 100%; left: 0; top: 0; border-radius: 12px;" 
                        src="${videoUrl}&autoplay=0"
                        scrolling="no" 
                        frameborder="no" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;
                // 将模板插入到 DOM 中
                content += biliTemplate;

            } else if (videoType === 'youtube') {
                // YouTube 视频模板
                // 从形如https://youtu.be/2V6lvCUPT8I?si=DVhUas6l6qlAr6Ru的链接中提取视频 ID2V6lvCUPT8I
                const youtubeTemplate = `
                <div style="position: relative; padding: 30% 45%; margin-top: 10px;">
                    <iframe width="100%"
                        style="position: absolute; width: 100%; height: 100%; left: 0; top: 0; border-radius: 12px;"
                        src="${videoUrl}"
                        title="YouTube video player" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        referrerpolicy="strict-origin-when-cross-origin" 
                        allowfullscreen>
                    </iframe>
                </div>
            `;
                // 将模板插入到 DOM 中
                content += youtubeTemplate;
            }
        }

        return {
            content: content,
            user: item.user.nickname || '匿名',
            avatar: item.user.avatarUrl || 'https://p.liiiu.cn/i/2024/03/29/66061417537af.png',
            date: date,
            location: item.location || '陕西西安',
            tags: item.tags ? item.tags.split(',').filter(tag => tag.trim() !== '') : ['无标签'],
            text: content.replace(/\[(.*?)\]\((.*?)\)/g, '[链接]' + `${imgs.length ? '[图片]' : ''}`)
        };
    };

    const generateTalkElement = (item) => {
        const talkItem = document.createElement('div');
        talkItem.className = 'talk_item';

        const talkMeta = document.createElement('div');
        talkMeta.className = 'talk_meta';

        const avatar = document.createElement('img');
        avatar.className = 'no-lightbox avatar';
        avatar.src = item.avatar;

        const info = document.createElement('div');
        info.className = 'info';

        const talkNick = document.createElement('span');
        talkNick.className = 'talk_nick';
        talkNick.innerHTML = `${item.user} ${generateIconSVG()}`;

        const talkDate = document.createElement('span');
        talkDate.className = 'talk_date';
        talkDate.textContent = item.date;

        const talkContent = document.createElement('div');
        talkContent.className = 'talk_content';
        talkContent.innerHTML = item.content;

        const talkBottom = document.createElement('div');
        talkBottom.className = 'talk_bottom';

        const TagContainer = document.createElement('div');

        const talkTag = document.createElement('span');
        talkTag.className = 'talk_tag';
        talkTag.textContent = `🏷️${item.tags}`;

        const locationTag = document.createElement('span');
        locationTag.className = 'location_tag';
        locationTag.textContent = `🌍${item.location}`;

        TagContainer.appendChild(talkTag);
        TagContainer.appendChild(locationTag);

        const commentLink = document.createElement('a');
        commentLink.href = 'javascript:;';
        commentLink.onclick = () => goComment(item.text);
        const commentIcon = document.createElement('span');
        commentIcon.className = 'icon';
        const commentIconInner = document.createElement('i');
        commentIconInner.className = 'fa-solid fa-message fa-fw';
        commentIcon.appendChild(commentIconInner);
        commentLink.appendChild(commentIcon);

        talkMeta.appendChild(avatar);
        info.appendChild(talkNick);
        info.appendChild(talkDate);
        talkMeta.appendChild(info);
        talkItem.appendChild(talkMeta);
        talkItem.appendChild(talkContent);
        talkBottom.appendChild(TagContainer);
        talkBottom.appendChild(commentLink);
        talkItem.appendChild(talkBottom);

        return talkItem;
    };

    /**
     * 瀑布流布局优化函数
     * 根据内容长度动态调整卡片排列
     */
    const optimizeMasonryLayout = () => {
        const container = document.getElementById('talk');
        const items = container.querySelectorAll('.talk_item');
        
        if (items.length === 0) return;

        // 等待所有图片加载完成后再进行布局优化
        const images = container.querySelectorAll('img');
        let loadedImages = 0;
        
        const checkLayout = () => {
            loadedImages++;
            if (loadedImages >= images.length) {
                performLayout();
            }
        };

        const performLayout = () => {
            // 检测是否支持 CSS Grid
            if (CSS.supports('display', 'grid')) {
                // 使用 CSS Grid 的 masonry 特性（如果浏览器支持）
                if (CSS.supports('grid-template-rows', 'masonry')) {
                    container.style.gridTemplateRows = 'masonry';
                } else {
                    // 降级方案：使用 JavaScript 模拟瀑布流
                    simulateMasonryLayout(container, items);
                }
            }
        };

        // 为每个图片添加加载监听器
        if (images.length > 0) {
            images.forEach(img => {
                if (img.complete) {
                    checkLayout();
                } else {
                    img.addEventListener('load', checkLayout);
                    img.addEventListener('error', checkLayout);
                }
            });
        } else {
            performLayout();
        }
    };

    /**
     * JavaScript 模拟瀑布流布局
     */
    const simulateMasonryLayout = (container, items) => {
        // 获取容器宽度和列数
        const containerWidth = container.offsetWidth;
        const itemWidth = 300; // 最小卡片宽度
        const gap = 16; // 间距
        const columns = Math.floor((containerWidth + gap) / (itemWidth + gap));
        
        if (columns <= 1) return; // 单列时不需要特殊处理

        // 创建列高度数组
        const columnHeights = new Array(columns).fill(0);
        
        items.forEach((item, index) => {
            // 找到最短的列
            const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
            
            // 计算位置
            const x = shortestColumnIndex * (itemWidth + gap);
            const y = columnHeights[shortestColumnIndex];
            
            // 设置绝对定位
            item.style.position = 'absolute';
            item.style.left = `${x}px`;
            item.style.top = `${y}px`;
            item.style.width = `${itemWidth}px`;
            
            // 更新列高度
            columnHeights[shortestColumnIndex] += item.offsetHeight + gap;
        });
        
        // 设置容器高度
        const maxHeight = Math.max(...columnHeights);
        container.style.height = `${maxHeight}px`;
        container.style.position = 'relative';
    };

    /**
     * 添加窗口大小变化监听器
     * 确保布局在响应式变化时能够重新优化
     */
    const addResizeListener = () => {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                optimizeMasonryLayout();
            }, 250);
        });
    };

    const goComment = (e) => {
        const match = e.match(/<div class="talk_content_text">([\s\S]*?)<\/div>/);
        const textContent = match ? match[1] : "";
        const n = document.querySelector(".wl-editor");
        if (n) {
            n.value = `> ${textContent}\n\n`;
            n.focus();
            // 使用类似友链页面的提示机制
            document.dispatchEvent(new CustomEvent('toast', {
                detail: {
                    message: '已为您引用该说说，不删除空格效果更佳 ✨'
                }
            }));
        } else {
            // 如果找不到评论输入框，也显示提示
            document.dispatchEvent(new CustomEvent('toast', {
                detail: {
                    message: '未找到评论输入框，请确保页面已完全加载 ⚠️'
                }
            }));
        }
    };
    

    const formatTime = (time) => {
        const d = new Date(time);
        const ls = [
            d.getFullYear(),
            d.getMonth() + 1,
            d.getDate(),
            d.getHours(),
            d.getMinutes(),
            d.getSeconds(),
        ];
        const r = ls.map((a) => (a.toString().length === 1 ? '0' + a : a));
        return `${r[0]}-${r[1]}-${r[2]} ${r[3]}:${r[4]}`;
    };

    fetchAndRenderTalks();
}

renderTalks();

// function whenDOMReady() {
//     const talkContainer = document.querySelector('#talk');
//     talkContainer.innerHTML = '';
//     fetchAndRenderTalks();
// }
// whenDOMReady();
// document.addEventListener("pjax:complete", whenDOMReady);