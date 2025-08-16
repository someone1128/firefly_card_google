// background.js - 国际化版本

let selectedText = '';
const baseUrl = 'https://fireflycard.shushiai.com/edit';

// 获取当前语言设置
function getCurrentLanguage() {
    return chrome.i18n.getUILanguage() || 'zh_CN';
}

// 国际化日期格式生成
function getCurrentDateFormatted() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    const lang = getCurrentLanguage();
    
    // 根据语言环境格式化日期
    if (lang.startsWith('zh')) {
        return `${year}${chrome.i18n.getMessage("date_year")}${month}${chrome.i18n.getMessage("date_month")}${day}${chrome.i18n.getMessage("date_day")}`;
    } else if (lang.startsWith('ja')) {
        return `${year}年${month}月${day}日`;
    } else if (lang.startsWith('ko')) {
        return `${year}년 ${month}월 ${day}일`;
    } else {
        // 英文和其他语言使用标准格式
        return new Intl.DateTimeFormat(lang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(now);
    }
}

// 计算文本字符数（去除HTML标签）
function countTextLength(text) {
    if (!text) return 0;
    // 移除HTML标签
    const textOnly = text.replace(/<[^>]*>/g, '');
    return textOnly.length;
}

// 格式化内容，将换行符转换为 <br /> 标签
function formatContent(content) {
    if (!content) return '';
    
    // 将各种换行符统一转换为 <br />
    return content
        .replace(/\r\n/g, '<br />') // Windows换行符
        .replace(/\n/g, '<br />') // Unix/Linux换行符
        .replace(/\r/g, '<br />'); // 旧Mac换行符
}

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

    // 语言设置 - 动态获取，默认中文
    const currentLang = getCurrentLanguage();
    const lang = currentLang.startsWith('en') ? 'en' : 'zh';

    // 根据是否有图片决定是否转换换行符
    const hasImages = postInfo && postInfo.images && postInfo.images.length > 0;
    const processedContent = hasImages ? finalContent : formatContent(finalContent);

    // 构建新的form对象
    const form = {
        date: getCurrentDateFormatted(),
        title: '', // 标题留空，内容放在content字段
        content: processedContent || '', // 有图片时保持原始格式，无图片时转换<br/>
    };
    
    // 只有从社交媒体平台点击时才添加icon和author
    if (postInfo) {
        if (postInfo.icon) {
            form.icon = postInfo.icon;
        }
        if (postInfo.author) {
            form.author = postInfo.author;
        }
    }

    // 构建style对象（使用默认样式配置）
    const style = {
        align: 'left',
        height: 0,
    };

    // 更新switchConfig对象 - 根据是否有postInfo动态设置
    const switchConfig = {
        showIcon: !!(postInfo && postInfo.icon), // 只有社交媒体平台有icon时才显示
        showDate: true,
        showTitle: false,
        showContent: true,
        showAuthor: !!(postInfo && postInfo.author), // 只有社交媒体平台有author时才显示
        showTextCount: true,
        showQRCode: false,
        showPageNum: false,
        showWatermark: false,
        showTGradual: true
    };

    // 构建新的查询参数
    const formParam = encodeURIComponent(JSON.stringify(form));
    const styleParam = encodeURIComponent(JSON.stringify(style));
    const switchConfigParam = encodeURIComponent(JSON.stringify(switchConfig));
    
    const queryString = `form=${formParam}&style=${styleParam}&switchConfig=${switchConfigParam}&temp=tempEasy&language=${lang}`;
    const newUrl = `${baseUrl}?${queryString}`;

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
    // 直接跳转到网址，不传递任何参数
    const cleanUrl = baseUrl;
    
    chrome.tabs.query({}, function(tabs) {
        if (chrome.runtime.lastError) {
            console.error(`Error querying tabs: ${chrome.runtime.lastError.message}`);
            return;
        }

        let foundTab = tabs.find(tab => tab.url && tab.url.startsWith(baseUrl));

        if (foundTab) {
            chrome.tabs.update(foundTab.id, { url: cleanUrl, active: true }, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error updating tab: ${chrome.runtime.lastError.message}`);
                }
            });
        } else {
            chrome.tabs.create({ url: cleanUrl, active: true }, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error creating tab: ${chrome.runtime.lastError.message}`);
                }
            });
        }
    });
});

// 在现有代码的末尾添加以下内容

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'navigateToFireflyCard') {
        navigateToFireflyCard(message.content, message.postInfo);
        sendResponse({success: true});
    }
    return true;  // 这表示我们会异步发送响应
});
