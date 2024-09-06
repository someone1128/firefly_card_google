// background.js

let selectedText = '';
const baseUrl = 'https://fireflycard.shushiai.com';
// const baseUrl = 'http://localhost:3000';

function navigateToFireflyCard(content = '', postInfo = null) {
    let finalContent = content;

    // 添加图片
    if (postInfo && postInfo.images && postInfo.images.length > 0) {
        finalContent += '\n\n';
        postInfo.images.forEach(img => {
            if (img) {
                finalContent += `![image](${img})\n`;
            }
        });
    }

    const encodedText = finalContent ? encodeURIComponent(finalContent.replace(/ {2}/g, '__NEWLINE__')) : '';

    const lang = chrome.i18n.getUILanguage().startsWith('zh') ? 'zh' : 'en';

    const switchConfig = {
        showTitle: false,
        showQRCode:false
    };

    // 添加空值检查
    const author = postInfo && postInfo.author ? encodeURIComponent(postInfo.author) : '';
    const icon = postInfo && postInfo.icon ? encodeURIComponent(postInfo.icon) : '';

    const queryString = `content=${encodedText}&author=${author}&icon=${icon}&height=0&switchConfig=${JSON.stringify(switchConfig)}`;

    const newUrl = `${baseUrl}/${lang}?${queryString}`;

    chrome.tabs.query({}, function(tabs) {
        if (chrome.runtime.lastError) {
            console.error(`Error querying tabs: ${chrome.runtime.lastError.message}`);
            return;
        }

        let foundTab = tabs.find(tab => tab.url && tab.url.startsWith(baseUrl));

        if (foundTab) {
            chrome.tabs.update(foundTab.id, { url: newUrl, active: true }, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error updating tab: ${chrome.runtime.lastError.message}`);
                }
            });
        } else {
            chrome.tabs.create({ url: newUrl, active: true }, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error creating tab: ${chrome.runtime.lastError.message}`);
                }
            });
        }
    });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "fireflyRedirect",
        title: chrome.i18n.getMessage("contextMenuTitle"),
        contexts: ["all"]
    }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Error creating context menu: ${chrome.runtime.lastError.message}`);
        } else {
            console.log('Context menu created successfully');
        }
    });
});

// 接收来自 content.js 的选中文本
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'sendSelectedText' && typeof message.text === 'string') {
        selectedText = message.text.trim();
    }
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "fireflyRedirect") {
        navigateToFireflyCard(selectedText);
    }
});

chrome.action.onClicked.addListener((tab) => {
    navigateToFireflyCard();
});

// 在现有代码的末尾添加以下内容

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'navigateToFireflyCard') {
        navigateToFireflyCard(message.content, message.postInfo);
        sendResponse({success: true});
    }
    return true;  // 这表示我们会异步发送响应
});
