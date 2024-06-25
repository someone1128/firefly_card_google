// background.js

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "fireflyRedirect",
        title: "流光卡片",
        contexts: ["selection"]
    });
});

// 接收来自 content.js 的选中文本
let selectedText = '';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'sendSelectedText') {
        selectedText = message.text;
    }
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "fireflyRedirect" && selectedText) {
        console.log("选中文本",selectedText);
        // 将连续两个空格替换为自定义标记
        const encodedText = encodeURIComponent(selectedText.trim().replace(/ {2}/g, '__NEWLINE__'));
        const baseUrl = 'https://fireflycard.shushiai.com';
        const newUrl = `${baseUrl}?content=${encodedText}`;

        // 获取所有打开的标签页
        chrome.tabs.query({}, function(tabs) {
            let foundTab = tabs.find(tab => tab.url && tab.url.startsWith(baseUrl));

            if (foundTab) {
                // 如果找到了已经打开的标签页，更新其URL并激活该标签页
                chrome.tabs.update(foundTab.id, { url: newUrl, active: true });
            } else {
                // 如果没有找到，创建一个新的标签页并激活它
                chrome.tabs.create({ url: newUrl, active: true });
            }
        });
    }
});
