// content.js

let lastSentText = '';
const throttleDuration = 300; // 减少节流时间到300毫秒

// 检查扩展上下文是否有效
function isExtensionContextValid() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (error) {
        return false;
    }
}

function sendSelectedText() {
    try {
        // 检查扩展上下文
        if (!isExtensionContextValid()) {
            console.warn('Extension context is invalid. Skipping text selection.');
            return;
        }

        const selection = window.getSelection();
        if (selection) {
            const selectedText = selection.toString().trim();
            if (selectedText.length > 0 && selectedText !== lastSentText) {
                lastSentText = selectedText;
                
                chrome.runtime.sendMessage({
                    type: 'sendSelectedText',
                    text: selectedText
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Error sending selected text:', chrome.runtime.lastError.message);
                        // 不显示用户错误提示，因为这是后台操作
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error in sendSelectedText:', error);
        // 静默处理错误，避免影响用户体验
    }
}

document.addEventListener('mouseup', () => {
    setTimeout(sendSelectedText, 10); // 稍微延迟执行，以确保选择已完成
});

document.addEventListener('keyup', (e) => {
    // 检查是否按下了可能影响文本选择的键
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Meta' || e.key === 'Alt') {
        setTimeout(sendSelectedText, 10);
    }
});
