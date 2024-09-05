// content.js

let lastSentText = '';
const throttleDuration = 300; // 减少节流时间到300毫秒

function sendSelectedText() {
    const selection = window.getSelection();
    if (selection) {
        const selectedText = selection.toString().trim();
        if (selectedText.length > 0 && selectedText !== lastSentText) {
            lastSentText = selectedText;
            chrome.runtime.sendMessage({
                type: 'sendSelectedText',
                text: selectedText
            });
        }
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
