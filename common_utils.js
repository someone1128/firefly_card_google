// common_utils.js

function sendToFireflyCard(content, postInfo = {}) {
    console.log("Sending content to background script:", content);
    console.log("Sending postInfo to background script:", postInfo);

    chrome.runtime.sendMessage({
        type: 'navigateToFireflyCard',
        content: content,
        postInfo: postInfo
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            alert(`发生错误: ${chrome.runtime.lastError.message}`);
        } else {
            console.log('消息发送成功');
        }
    });
}

