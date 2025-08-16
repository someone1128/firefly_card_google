console.log("Jike content script loaded for URL:", window.location.href);

// 检查扩展上下文是否有效
function isExtensionContextValid() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (error) {
        return false;
    }
}


function createFireflyButton(platform) {
    try {
        if (!isExtensionContextValid()) {
            console.error('Cannot create button: Extension context is invalid');
            return null;
        }

        const button = document.createElement('div');
        button.className = `firefly-button ${platform}-firefly-button`;
        button.title = chrome.i18n.getMessage("ui_buttonTitle") || chrome.i18n.getMessage("contextMenuTitle") || "Streamer Card";
        const iconUrl = chrome.runtime.getURL('images/logo.png');
        button.innerHTML = `<img src="${iconUrl}" alt="Firefly Card" onerror="console.error('Failed to load icon:', this.src);">`;
        return button;
    } catch (error) {
        console.error("Error creating Firefly button:", error);
        return null;
    }
}

// 即刻特定的函数
function extractJikePostInfo(postElement) {
    console.log("Extracting Jike post info", postElement);
    const post = {
        icon: "",
        content: "",
        images: [],
        author: "",
        time: "",
        likes: 0,
        comments: 0,
        shares: 0
    };

    try {
        // 提取头像 - 使用精确的选择器
        const avatarImg = postElement.querySelector('.jk-avatar') || 
                         postElement.querySelector('img[alt="avatar"]');
        post.icon = avatarImg ? avatarImg.src : "";

        // 提取作者 - 使用精确的选择器
        const authorElement = postElement.querySelector('.jk-bjn8wh') ||
                            postElement.querySelector('.jk-link-text span');
        post.author = authorElement ? authorElement.textContent.trim() : "";

        // 提取时间 - 查找时间显示区域
        const timeElement = postElement.querySelector('.jk-1pi78hi') ||
                          postElement.querySelector('time, [datetime]');
        post.time = timeElement ? (timeElement.getAttribute('datetime') || timeElement.textContent) : "";

        // 提取内容和图片 - 基于结构层次而非具体类名
        const contentContainer = postElement.querySelector('.jk-1ul99ii');
        if (contentContainer) {
            // 提取内容：在内容容器内查找包含文本的div，排除UI元素
            const textDivs = contentContainer.querySelectorAll('div');
            const contentElement = Array.from(textDivs).find(div => {
                const text = div.textContent.trim();
                return text.length > 10 && // 有足够的文本内容
                       !div.querySelector('svg') && // 不包含图标
                       !div.querySelector('a') && // 不包含链接
                       !div.querySelector('img') && // 不包含图片
                       !div.querySelector('.jk-7yjp5b'); // 不包含操作按钮区域
            });
            
            if (contentElement) {
                post.content = contentElement.innerHTML;
            }

            // 提取图片：仅从内容区域提取，类似Twitter的精确定位
            const imageElements = contentContainer.querySelectorAll('img');
            post.images = Array.from(imageElements)
                .filter(img => {
                    // 排除头像（双重保险）
                    if (img.classList.contains('jk-avatar')) return false;
                    // 排除小图标和装饰图片
                    if (img.width < 50 || img.height < 50) return false;
                    // 排除SVG和小尺寸图片
                    const src = img.src || img.getAttribute('data-src') || '';
                    if (src.includes('data:image/svg') || src.includes('userProfile/') || src.includes('avatar')) return false;
                    // 确保是有效的图片URL
                    return src.startsWith('http');
                })
                .map(img => {
                    let src = img.src || img.getAttribute('data-src') || '';
                    // 处理即刻的图片URL，获取高清版本（类似Twitter的&name=orig处理）
                    if (src.includes('ruguoapp.com') && src.includes('thumbnail')) {
                        // 移除缩略图参数，获取原图
                        src = src.split('?')[0];
                    }
                    return src;
                })
                .filter(Boolean);
        } else {
            post.images = [];
        }

        // 提取统计数据 - 从操作按钮区域获取
        const actionsElement = postElement.querySelector('.jk-7yjp5b');
        if (actionsElement) {
            const buttons = actionsElement.querySelectorAll('[class*="jk-"]');
            buttons.forEach((button, index) => {
                const text = button.textContent.trim();
                const number = parseInt(text) || 0;
                if (index === 0) post.likes = number;
                else if (index === 1) post.comments = number;
                else if (index === 2) post.shares = number;
            });
        }

        console.log("Extracted Jike Post Info:", post);
        return post;
    } catch (error) {
        console.error("Error extracting Jike post info:", error);
        return post;
    }
}

function getJikeContent(postElement) {
    const postInfo = extractJikePostInfo(postElement);
    if (!postInfo) return { content: "", postInfo: null };

    console.log("Extracted Jike Post Info:", postInfo);

    // 将HTML中的<br>标签转换为实际的换行符
    let content = postInfo.content.replace(/<br\s*\/?>/gi, '\n');

    // 移除所有其他HTML标签
    content = content.replace(/<[^>]*>/g, '');

    // 解码HTML实体
    const textarea = document.createElement('textarea');
    textarea.innerHTML = content;
    content = textarea.value;

    return { content: content.trim(), postInfo };
}

function addFireflyButtonToJikePost(postElement) {
    // 新版即刻的操作按钮区域
    const actionsElement = postElement.querySelector('.jk-7yjp5b');
    if (actionsElement && !actionsElement.querySelector('.jike-firefly-button')) {
        try {
            // 检查扩展上下文
            if (!isExtensionContextValid()) {
                console.error('Cannot create button: Extension context is invalid');
                return;
            }

            // 创建按钮容器，模仿新版即刻的按钮样式
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'jk-dbwa1i jike-firefly-button'; // 添加防重复类名
            buttonContainer.setAttribute('tabindex', '0');
            buttonContainer.style.cssText = 'display: flex; align-items: center; justify-content: center; cursor: pointer;';
            
            // 创建图标元素
            const fireflyIcon = chrome.runtime.getURL('images/logo.png');
            const iconImg = document.createElement('img');
            iconImg.src = fireflyIcon;
            iconImg.alt = chrome.i18n.getMessage("ui_buttonTitle") || 'Streamer Card';
            iconImg.style.cssText = `
                width: 20px; 
                height: 20px; 
                opacity: 0.7;
                flex-shrink: 0;
            `;
            
            buttonContainer.appendChild(iconImg);
            
            // 添加到操作区域末尾
            actionsElement.appendChild(buttonContainer);

            // 添加点击时的轻微缩放效果
            buttonContainer.addEventListener('mousedown', () => {
                buttonContainer.style.transform = 'scale(0.95)';
            });

            buttonContainer.addEventListener('mouseup', () => {
                buttonContainer.style.transform = 'scale(1)';
            });

            buttonContainer.addEventListener('mouseleave', () => {
                buttonContainer.style.transform = 'scale(1)';
            });

            buttonContainer.addEventListener('click', async (e) => {
                console.log("Firefly button clicked");
                e.preventDefault();
                e.stopPropagation();
                try {
                    // 检查扩展上下文
                    if (!isExtensionContextValid()) {
                        console.error('Extension context is invalid');
                        showUserFriendlyError(chrome.i18n.getMessage('errors_extensionContextInvalid') || 'Extension context is invalid, please refresh the page');
                        return;
                    }

                    const { content, postInfo } = getJikeContent(postElement);
                    if (content && postInfo) {
                        await sendToFireflyCard(content, postInfo);
                    }
                } catch (error) {
                    console.error("Error processing Jike post:", error);
                    showUserFriendlyError(chrome.i18n.getMessage('errors_processJikeError') || 'Error processing Jike post, please try again');
                }
            });
        } catch (error) {
            console.error("Error adding Firefly button to Jike post:", error);
        }
    }
}

function observeJikeTimeline() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 查找新添加的帖子容器
                        const posts = [];
                        
                        // 如果新节点本身就是帖子容器
                        if (node.classList && node.classList.contains('jk-1i3egjr') && !node.classList.contains('firefly-processed')) {
                            posts.push(node);
                        }
                        
                        // 查找新节点内部的帖子容器
                        const innerPosts = node.querySelectorAll ? node.querySelectorAll('.jk-1i3egjr:not(.firefly-processed)') : [];
                        posts.push(...Array.from(innerPosts));
                        
                        posts.forEach(post => {
                            // 确保帖子有操作按钮区域
                            if (post.querySelector('.jk-7yjp5b')) {
                                addFireflyButtonToJikePost(post);
                                post.classList.add('firefly-processed');
                            }
                        });
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function initializeExtension() {
    console.log("Initializing extension for Jike");
    try {
        observeJikeTimeline();
        // 查找已存在的帖子
        const existingPosts = document.querySelectorAll('.jk-1i3egjr:not(.firefly-processed)');
        
        console.log("Found existing posts:", existingPosts.length);
        existingPosts.forEach(post => {
            // 确保帖子有操作按钮区域
            if (post.querySelector('.jk-7yjp5b')) {
                addFireflyButtonToJikePost(post);
                post.classList.add('firefly-processed');
            }
        });
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

// 使用 setTimeout 来确保在页面加载完成后初始化扩展
setTimeout(initializeExtension, 1000);

console.log("Jike content script setup complete");
