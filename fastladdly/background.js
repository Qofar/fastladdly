chrome.browserAction.onClicked.addListener(function() {
    chrome.tabs.create({url:"web/init.html"});
});
