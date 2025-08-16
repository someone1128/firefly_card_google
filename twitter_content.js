console.log("Twitter content script loaded for URL:", window.location.href);

// 检查扩展上下文是否有效
function isExtensionContextValid() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (error) {
        return false;
    }
}

// 显示用户友好的错误提示
function showUserFriendlyError(message) {
    const errorElement = document.createElement('div');
    errorElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 3000);
}

function createFireflyButton() {
    try {
        if (!isExtensionContextValid()) {
            console.error('Cannot create button: Extension context is invalid');
            return null;
        }

        const button = document.createElement('div');
        button.className = 'firefly-button twitter-firefly-button';
        button.title = chrome.i18n.getMessage("ui_buttonTitle") || chrome.i18n.getMessage("contextMenuTitle") || "Streamer Card";
        const iconUrl = chrome.runtime.getURL('images/logo.png');
        button.innerHTML = `<img src="${iconUrl}" alt="Firefly Card" onerror="console.error('Failed to load icon:', this.src);">`;
        return button;
    } catch (error) {
        console.error("Error creating Firefly button:", error);
        return null;
    }
}

function extractTweetInfo(articleElement) {
    const tweet = {
        url: '',
        icon: "",  // 改为 icon
        author: "",  // 改为 author
        time: 0,
        text: "",
        tags: [],
        images: [],
        links: [],
        shares: 0,
        replies: 0,
        likes: 0,
    };

    try {
        // 提取头像
        const avatarImg = articleElement.querySelector('img[draggable="true"]');
        tweet.icon = avatarImg ? avatarImg.src : "";  // 使用 icon

        // 提取用户信息和时间
        const userInfoDiv = articleElement.querySelector('[data-testid="User-Name"]');
        if (userInfoDiv) {
            const urls = Array.from(userInfoDiv.querySelectorAll('a')).map(e => e.href);
            tweet.url = urls.find((url) => url.includes('status')) || '';
            const usernameElement = userInfoDiv.querySelector('div[dir="ltr"]');
            tweet.author = usernameElement ? usernameElement.textContent : "";  // 使用 author
            const timeElement = userInfoDiv.querySelector('time');
            if (timeElement) {
                const timeStr = timeElement.getAttribute('datetime');
                tweet.time = timeStr ? new Date(timeStr).getTime() / 1000 : 0;
            }
        }

        // 提取文本内容和标签
        const tweetTextElement = articleElement.querySelector('[data-testid="tweetText"]');
        if (tweetTextElement) {
            tweet.text = tweetTextElement.textContent || '';
            tweetTextElement.querySelectorAll('a[href^="/hashtag/"]').forEach(tag => {
                const tagText = tag.textContent;
                tweet.tags.push(tagText);
                tweet.text = tweet.text.replace(tagText, '');
            });
            tweet.text = tweet.text.trim();
        }

        // 提取图片
        const images = articleElement.querySelectorAll('[data-testid="tweetPhoto"] img');
        tweet.images = Array.from(images).map(img => img.src.replace(/&name=\w+$/, "&name=orig"));

        // 提取链接
        const links = articleElement.querySelectorAll('a[href^="https://"]');
        tweet.links = Array.from(links).map(link => ({
            href: link.href,
            text: link.textContent
        }));

        // 提取统计信息
        const stats = articleElement.querySelector('[role="group"]');
        if (stats) {
            const replyElement = stats.querySelector('[data-testid="reply"]');
            tweet.replies = replyElement ? replyElement.textContent : "0";
            const retweetElement = stats.querySelector('[data-testid="retweet"]');
            tweet.shares = retweetElement ? retweetElement.textContent : "0";
            const likeElement = stats.querySelector('[data-testid="like"]');
            tweet.likes = likeElement ? likeElement.textContent : "0";
        }
    } catch (error) {
        console.error("Error extracting tweet info:", error);
    }

    return tweet;
}

// 自动展开推文内容
async function expandTweetContent(tweetElement) {
    try {
        // 查找"显示更多"按钮
        const showMoreButton = tweetElement.querySelector('[data-testid="tweet-text-show-more-link"]');
        if (showMoreButton) {
            console.log("Found 'Show more' button, clicking to expand...");
            showMoreButton.click();
            
            // 等待内容展开
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log("Tweet content expanded successfully");
        } else {
            console.log("No 'Show more' button found - content is already fully visible");
        }
    } catch (error) {
        console.error("Error expanding tweet content:", error);
    }
}

function getTwitterContent(tweetElement) {
    const tweetInfo = extractTweetInfo(tweetElement);
    console.log("Tweet Info:", tweetInfo);
    return tweetInfo.text.trim();
}

function addFireflyButtonToTweet(tweetElement, retries = 3) {
    const actionsElement = tweetElement.querySelector('[role="group"]');
    if (actionsElement && !actionsElement.querySelector('.twitter-firefly-button')) {
        try {
            const fireflyButton = createFireflyButton();
            if (!fireflyButton) return;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.appendChild(fireflyButton);
            
            actionsElement.appendChild(buttonContainer);

            fireflyButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    // 检查扩展上下文
                    if (!isExtensionContextValid()) {
                        console.error('Extension context is invalid');
                        showUserFriendlyError(chrome.i18n.getMessage('errors_extensionContextInvalid') || 'Extension context is invalid, please refresh the page');
                        return;
                    }

                    // 自动点击"显示更多"按钮展开完整内容
                    await expandTweetContent(tweetElement);

                    const tweetInfo = extractTweetInfo(tweetElement);
                    const content = getTwitterContent(tweetElement);
                    if (content) {
                        await sendToFireflyCard(content, tweetInfo);
                    }
                } catch (error) {
                    console.error("Error processing tweet:", error);
                    if (error.message && error.message.includes("Extension context invalidated") && retries > 0) {
                        console.log(`Retrying... (${retries} attempts left)`);
                        setTimeout(() => addFireflyButtonToTweet(tweetElement, retries - 1), 1000);
                    } else {
                        showUserFriendlyError(chrome.i18n.getMessage('errors_processTwitterError') || 'Error processing tweet, please try again');
                    }
                }
            });
        } catch (error) {
            console.error("Error adding Firefly button to tweet:", error);
            if (error.message.includes("Extension context invalidated") && retries > 0) {
                console.log(`Retrying... (${retries} attempts left)`);
                setTimeout(() => addFireflyButtonToTweet(tweetElement, retries - 1), 1000);
            }
        }
    }
}

function observeTwitterTimeline() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const tweets = node.querySelectorAll('article[data-testid="tweet"]:not(.firefly-processed)');
                        tweets.forEach(tweet => {
                            try {
                                addFireflyButtonToTweet(tweet);
                                tweet.classList.add('firefly-processed');
                            } catch (error) {
                                console.error("Error processing tweet:", error);
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
    try {
        observeTwitterTimeline();
        const existingTweets = document.querySelectorAll('article[data-testid="tweet"]:not(.firefly-processed)');
        console.log("Found existing tweets:", existingTweets.length);
        existingTweets.forEach(tweet => {
            addFireflyButtonToTweet(tweet);
            tweet.classList.add('firefly-processed');
        });
    } catch (error) {
        console.error('Error initializing extension:', error);
    }
}

// 使用 setTimeout 来确保在页面加载完成后初始化扩展
setTimeout(initializeExtension, 1000);

console.log("Twitter content script setup complete");