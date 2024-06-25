// 当用户在页面上选中内容时，捕获选中的文本
document.addEventListener('mouseup', function() {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0) {
        // 发送选中的文本给 background.js
        chrome.runtime.sendMessage({
            type: 'sendSelectedText',
            text: selection
        });
    }
});
