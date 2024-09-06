console.log("Weibo content script loaded for URL:", window.location.href);

function createFireflyButton(retries = 3) {
    return new Promise((resolve, reject) => {
        const attempt = () => {
            try {
                const button = document.createElement('div');
                button.className = 'firefly-button weibo-firefly-button';
                button.title = chrome.i18n.getMessage("contextMenuTitle") || "流光卡片";
                const iconUrl = chrome.runtime.getURL('images/logo.png');
                console.log("Icon URL:", iconUrl);
                button.innerHTML = `<img src="${iconUrl}" alt="Firefly Card" onerror="console.error('Failed to load icon:', this.src);">`;
                resolve(button);
            } catch (error) {
                console.error("Error creating Firefly button:", error);
                if (retries > 0) {
                    console.log(`Retrying... (${retries} attempts left)`);
                    setTimeout(() => attempt(), 1000);
                    retries--;
                } else {
                    reject(error);
                }
            }
        };
        attempt();
    });
}

function extractWeiboPostInfo(postElement) {
    console.log("Extracting Weibo post info", postElement);
    const post = {
        icon: "",  // 改为 icon
        content: "",
        images: [],
        author: "",  // 改为 author
        time: "",
        reposts: 0,
        comments: 0,
        likes: 0
    };

    try {
        // 提取头像
        const avatarImg = postElement.querySelector('.woo-avatar-img');
        post.icon = avatarImg ? avatarImg.src : "";  // 使用 icon

        // 提取作者
        const authorElement = postElement.querySelector('.head_name_24eEB');
        post.author = authorElement ? authorElement.textContent.trim() : "";  // 使用 author

        // 提取时间
        const timeElement = postElement.querySelector('.head-info_time_6sFQg');
        post.time = timeElement ? timeElement.textContent.trim() : "";

        // 提取内容
        const contentElement = postElement.querySelector('.detail_wbtext_4CRf9');
        if (contentElement) {
            post.content = contentElement.innerHTML.trim();
        }

        // 提取图片
        const imageElements = postElement.querySelectorAll('.woo-picture-img');
        post.images = Array.from(imageElements).map(img => img.src || "");

        // 提取转发、评论和点赞数
        const footerElement = postElement.querySelector('footer');
        if (footerElement) {
            const stats = footerElement.getAttribute('aria-label').split(',');
            post.reposts = parseInt(stats[0]) || 0;
            post.comments = parseInt(stats[1]) || 0;
            post.likes = parseInt(stats[2]) || 0;
        }

        console.log("Extracted Weibo Post Info:", post);
        return post;
    } catch (error) {
        console.error("Error extracting Weibo post info:", error);
        return post;
    }
}

function getWeiboContent(postElement) {
    return new Promise((resolve) => {
        const contentElement = postElement.querySelector('.detail_wbtext_4CRf9');
        if (!contentElement) {
            resolve("");
            return;
        }

        const expandButton = contentElement.querySelector('.expand');
        if (expandButton) {
            const observer = new MutationObserver((mutations, obs) => {
                const postInfo = extractWeiboPostInfo(postElement);
                if (postInfo && postInfo.content) {
                    obs.disconnect();
                    console.log("Extracted Weibo Post Info:", postInfo);
                    resolve(processWeiboContent(postInfo.content));
                }
            });

            observer.observe(contentElement, { childList: true, subtree: true, characterData: true });
            expandButton.click();
        } else {
            const postInfo = extractWeiboPostInfo(postElement);
            console.log("Extracted Weibo Post Info:", postInfo);
            resolve(processWeiboContent(postInfo.content));
        }
    });
}

function processWeiboContent(content) {
    // 将HTML中的<br>和<p>标签转换为实际的换行符
    let processedContent = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<div[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n');
    
    // 移除所有其他HTML标签
    processedContent = processedContent.replace(/<[^>]*>/g, '');
    
    // 解码HTML实体
    const textarea = document.createElement('textarea');
    textarea.innerHTML = processedContent;
    processedContent = textarea.value;

    // 处理连续的换行，保留最多两个连续的换行
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n');

    // 移除行首和行尾的空白字符
    processedContent = processedContent.split('\n').map(line => line.trim()).join('\n');

    // 确保段落之间有一个空行
    processedContent = processedContent.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');

    return processedContent.trim();
}

function addFireflyButtonToWeiboPost(postElement) {
    if (!postElement) return;

    const toolbarElement = postElement.querySelector('.toolbar_main_3Mxwo');
    if (toolbarElement && !toolbarElement.querySelector('.weibo-firefly-button')) {
        createFireflyButton().then(fireflyButton => {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'woo-box-item-flex toolbar_item_1ky_D toolbar_cursor_34j5V';
            buttonContainer.appendChild(fireflyButton);
            
            toolbarElement.appendChild(buttonContainer);

            // 添加鼠标悬停事件
            postElement.addEventListener('mouseenter', () => {
                fireflyButton.style.visibility = 'visible';
                fireflyButton.style.opacity = '1';
            });

            postElement.addEventListener('mouseleave', () => {
                fireflyButton.style.visibility = 'hidden';
                fireflyButton.style.opacity = '0';
            });

            fireflyButton.addEventListener('click', async (e) => {
                console.log("Firefly button clicked");
                e.preventDefault();
                e.stopPropagation();
                const postInfo = extractWeiboPostInfo(postElement);
                const content = await getWeiboContent(postElement);
                if (content) {
                    sendToFireflyCard(content, postInfo);
                }
            });
        }).catch(error => {
            console.error("Failed to create Firefly button:", error);
        });
    }
}

function observeWeiboTimeline() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查新添加的节点是否是帖子，或者包含帖子
                        const posts = node.classList.contains('Feed_wrap_3v9LH') 
                            ? [node] 
                            : node.querySelectorAll('article.Feed_wrap_3v9LH');
                        posts.forEach(addFireflyButtonToWeiboPost);
                    }
                });
            } else if (mutation.type === 'attributes') {
                // 处理属性变化，可能是动态加载的内容
                if (mutation.target.classList.contains('Feed_wrap_3v9LH')) {
                    addFireflyButtonToWeiboPost(mutation.target);
                }
            }
        });
    });

    // 观察整个文档体，包括属性变化
    observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true, 
        attributeFilter: ['class'] 
    });
}

function initializeExtension() {
    console.log("Initializing extension for Weibo");
    try {
        observeWeiboTimeline();
        // 初始化时处理已存在的帖子
        const existingPosts = document.querySelectorAll('article.Feed_wrap_3v9LH');
        console.log("Found existing posts:", existingPosts.length);
        existingPosts.forEach(addFireflyButtonToWeiboPost);

        // 添加滚动事件监听器
        window.addEventListener('scroll', debounce(() => {
            const newPosts = document.querySelectorAll('article.Feed_wrap_3v9LH:not(.firefly-processed)');
            newPosts.forEach(post => {
                addFireflyButtonToWeiboPost(post);
                post.classList.add('firefly-processed');
            });
        }, 200));
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 使用 setTimeout 来确保在页面加载完成后初始化扩展
setTimeout(initializeExtension, 1000);

// 添加一个卸载监听器
window.addEventListener('unload', () => {
    console.log("Unloading Weibo extension");
    // 在这里可以进行一些清理工作
});

console.log("Weibo content script setup complete");