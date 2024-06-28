// content.js

let lastSentText = '';
const throttleDuration = 1000; // 节流时间间隔为1秒
let throttleTimeout = null;

document.addEventListener('mouseup', function() {
    if (throttleTimeout) {
        clearTimeout(throttleTimeout);
    }

    throttleTimeout = setTimeout(() => {
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
    }, throttleDuration);
});
