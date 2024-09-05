console.log("Twitter content script loaded for URL:", window.location.href);

function createFireflyButton() {
    const button = document.createElement('div');
    button.className = 'firefly-button';
    button.title = chrome.i18n.getMessage("contextMenuTitle");
    button.innerHTML = `<img src="${chrome.runtime.getURL('images/logo.png')}" alt="Firefly Card">`;
    return button;
}

function extractTweetInfo(articleElement) {
    const tweet = {
        url: '',
        avatar: "",
        username: "",
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
        tweet.avatar = avatarImg ? avatarImg.src : "";

        // 提取用户信息和时间
        const userInfoDiv = articleElement.querySelector('[data-testid="User-Name"]');
        if (userInfoDiv) {
            const urls = Array.from(userInfoDiv.querySelectorAll('a')).map(e => e.href);
            tweet.url = urls.find((url) => url.includes('status')) || '';
            const usernameElement = userInfoDiv.querySelector('div[dir="ltr"]');
            tweet.username = usernameElement ? usernameElement.textContent : "";
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

function getTwitterContent(tweetElement) {
    const tweetInfo = extractTweetInfo(tweetElement);
    console.log("Tweet Info:", tweetInfo);
    return tweetInfo.text.trim();
}

function addFireflyButtonToTweet(tweetElement) {
    const actionsElement = tweetElement.querySelector('[role="group"]');
    if (actionsElement && !actionsElement.querySelector('.twitter-firefly-button')) {
        try {
            const fireflyButton = createFireflyButton('twitter');
            if (!fireflyButton) return;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.appendChild(fireflyButton);
            
            actionsElement.appendChild(buttonContainer);

            fireflyButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tweetContent = getTwitterContent(tweetElement);
                if (tweetContent) {
                    sendToFireflyCard(tweetContent);
                }
            });
        } catch (error) {
            console.error("Error adding Firefly button to tweet:", error);
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
                            addFireflyButtonToTweet(tweet);
                            tweet.classList.add('firefly-processed');
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