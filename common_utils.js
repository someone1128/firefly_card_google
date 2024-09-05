// common_utils.js

function sendToFireflyCard(content) {
    console.log("Sending content to background script:", content);
    chrome.runtime.sendMessage({
        type: 'navigateToFireflyCard',
        content: content
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            alert(`An error occurred: ${chrome.runtime.lastError.message}`);
        } else {
            console.log('Message sent successfully');
        }
    });
}

function createFireflyButton(platform) {
    const button = document.createElement('div');
    button.className = `firefly-button ${platform}-firefly-button`;
    button.title = chrome.i18n.getMessage("contextMenuTitle") || "流光卡片";
    button.innerHTML = `<img src="${chrome.runtime.getURL('images/logo.png')}" alt="Firefly Card">`;
    return button;
}