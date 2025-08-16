// common_utils.js - 国际化版本

// 检查扩展上下文是否有效
function isExtensionContextValid() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (error) {
        return false;
    }
}

// 获取国际化消息的安全包装函数
function getI18nMessage(key, fallback = '') {
    try {
        return chrome.i18n.getMessage(key) || fallback;
    } catch (error) {
        console.error('Error getting i18n message:', key, error);
        return fallback;
    }
}

// 健壮的消息发送函数，包含重试机制和错误处理
function sendToFireflyCard(content, postInfo = {}, retries = 3) {
    console.log("Sending content to background script:", content);
    console.log("Sending postInfo to background script:", postInfo);

    // 检查扩展上下文
    if (!isExtensionContextValid()) {
        console.error('Extension context is invalid. Cannot send message.');
        showUserFriendlyError(getI18nMessage('errors_extensionContextInvalid', 'Extension context is invalid, please refresh the page'));
        return Promise.reject(new Error('Extension context invalidated'));
    }

    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage({
                type: 'navigateToFireflyCard',
                content: content,
                postInfo: postInfo
            }, (response) => {
                if (chrome.runtime.lastError) {
                    const error = chrome.runtime.lastError;
                    console.error('Error sending message:', error);
                    
                    // 如果是上下文失效错误且还有重试次数，则重试
                    if (error.message && error.message.includes('Extension context invalidated') && retries > 0) {
                        console.log(`Context invalidated, retrying... (${retries} attempts left)`);
                        setTimeout(() => {
                            sendToFireflyCard(content, postInfo, retries - 1)
                                .then(resolve)
                                .catch(reject);
                        }, 1000);
                        return;
                    }
                    
                    showUserFriendlyError(
                        `${getI18nMessage('errors_generalError', 'An error occurred')}: ${error.message}`
                    );
                    reject(error);
                } else {
                    console.log(getI18nMessage('success_messageSent', 'Message sent successfully'));
                    resolve(response);
                }
            });
        } catch (error) {
            console.error('Error in sendToFireflyCard:', error);
            if (retries > 0 && error.message.includes('Extension context invalidated')) {
                console.log(`Exception caught, retrying... (${retries} attempts left)`);
                setTimeout(() => {
                    sendToFireflyCard(content, postInfo, retries - 1)
                        .then(resolve)
                        .catch(reject);
                }, 1000);
            } else {
                showUserFriendlyError(
                    getI18nMessage('errors_extensionError', 'Extension error occurred, please refresh and try again')
                );
                reject(error);
            }
        }
    });
}

// 显示用户友好的错误提示 - 国际化版本
function showUserFriendlyError(message) {
    // 创建一个临时的错误提示元素
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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 3000);
}

// 显示成功提示
function showSuccessMessage(message) {
    const successElement = document.createElement('div');
    successElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    successElement.textContent = message;
    
    document.body.appendChild(successElement);
    
    // 2秒后自动移除
    setTimeout(() => {
        if (successElement.parentNode) {
            successElement.parentNode.removeChild(successElement);
        }
    }, 2000);
}

