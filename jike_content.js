console.log("Jike content script loaded for URL:", window.location.href);

// 包含 common_utils.js 的内容
function createFireflyButton(platform) {
    try {
        const button = document.createElement('div');
        button.className = `firefly-button ${platform}-firefly-button`;
        button.title = chrome.i18n.getMessage("contextMenuTitle") || "流光卡片";
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
        // 提取头像
        const avatarImg = postElement.querySelector('.AvatarImage___StyledImg-sc-1kapr56-0');
        post.icon = avatarImg ? avatarImg.src : "";

        // 提取作者
        const authorElement = postElement.querySelector('.flex.flex-row.pt-0\\.5.pb-1 a');
        post.author = authorElement ? authorElement.textContent.trim() : "";

        // 提取时间
        const timeElement = postElement.querySelector('time');
        post.time = timeElement ? timeElement.getAttribute('datetime') : "";

        // 提取内容
        const contentElement = postElement.querySelector('.break-words.content_truncate__tFX8J');
        if (contentElement) {
            post.content = contentElement.innerHTML;
        }

        // 提取图片
        const imageElements = postElement.querySelectorAll('.MessagePictureGrid__StyledImage-sc-pal5rf-2');
        post.images = Array.from(imageElements).map(img => img.src || "");

        // 提取点赞、评论和分享数
        const statsElements = postElement.querySelectorAll('.min-w-\\[120px\\].items-center.flex.cursor-pointer span');
        if (statsElements.length >= 3) {
            post.likes = parseInt(statsElements[0].textContent) || 0;
            post.comments = parseInt(statsElements[1].textContent) || 0;
            post.shares = parseInt(statsElements[2].textContent) || 0;
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
    const actionsElement = postElement.querySelector('.flex.flex-row.mt-\\[13px\\].text-tint-icon-gray.text-body-3.font-medium.h-6');
    if (actionsElement && !actionsElement.querySelector('.jike-firefly-button')) {
        try {
            const fireflyButton = createFireflyButton('jike');
            if (!fireflyButton) return;

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'min-w-[120px] items-center flex cursor-pointer hover:text-web-icon-gray_hover';
            buttonContainer.appendChild(fireflyButton);

            // 插入到倒数第二个位置
            const children = Array.from(actionsElement.children);
            const insertIndex = Math.max(0, children.length - 1);
            actionsElement.insertBefore(buttonContainer, children[insertIndex]);

            // 添加鼠标悬停事件
            postElement.addEventListener('mouseenter', () => {
                fireflyButton.style.visibility = 'visible';
                fireflyButton.style.opacity = '1';
            });

            postElement.addEventListener('mouseleave', () => {
                fireflyButton.style.visibility = 'hidden';
                fireflyButton.style.opacity = '0';
            });

            fireflyButton.addEventListener('click', (e) => {
                console.log("Firefly button clicked");
                e.preventDefault();
                e.stopPropagation();
                const { content, postInfo } = getJikeContent(postElement);
                if (content && postInfo) {
                    sendToFireflyCard(content, postInfo);  // 使用更新后的函数
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
                        const posts = node.querySelectorAll('article.flex.items-start.transition.duration-100.bg-bg-body-1:not(.firefly-processed)');
                        posts.forEach(post => {
                            addFireflyButtonToJikePost(post);
                            post.classList.add('firefly-processed');
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
        const existingPosts = document.querySelectorAll('article.flex.items-start.transition.duration-100.bg-bg-body-1');
        console.log("Found existing posts:", existingPosts.length);
        existingPosts.forEach(addFireflyButtonToJikePost);
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

// 使用 setTimeout 来确保在页面加载完成后初始化扩展
setTimeout(initializeExtension, 1000);

console.log("Jike content script setup complete");
