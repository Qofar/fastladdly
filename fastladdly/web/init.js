(function() {
    function getAccessToken() {
        return localStorage.getItem("access_token");
    }

    function goMainPage() {
        location.href = "reader.html";
    }

    if (getAccessToken() === null) {
        feedly.errToken();

        var timer = setInterval(function() {
            if (getAccessToken() !== null) {
                clearInterval(timer);
                goMainPage();
            }
        }, 500);
    } else {
        goMainPage();
    }
})();
