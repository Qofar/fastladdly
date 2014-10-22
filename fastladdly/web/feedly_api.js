var _Array = Array;
var _JSON = JSON;

var feedly = {
	// BASE : "https://feedly.com/v3",
	BASE : "https://cloud.feedly.com/v3",
	// BASE : "https://sandbox.feedly.com/v3",

	access_token : localStorage.getItem("access_token"),
	refresh_token : localStorage.getItem("refresh_token"),
	token_type : localStorage.getItem("token_type"),
	id : localStorage.getItem("id"),
	plan : localStorage.getItem("plan"),

	lastUpdated : 0,
	subs : {},


	getToken: function() {
		// var authUrl = feedly.BASE+"/auth/auth?client_id=sandbox&redirect_uri="+encodeURIComponent("http://localhost")+
		// 			  "&scope=https://cloud.feedly.com/subscriptions&response_type=code";
		var authUrl = feedly.BASE+"/auth/auth?client_id=feedly&redirect_uri="+encodeURIComponent("http://localhost")+
					   "&scope=https://cloud.feedly.com/subscriptions&response_type=code";
		chrome.tabs.create({ url: authUrl }, function(authTab) {
			chrome.tabs.onUpdated.addListener(function tabOnUpdate(tabId, changeInfo, tab) {
				if (tabId === authTab.id && changeInfo.status === "loading") {
					var regCode = /code=(.+?)(?:&|$)/i;
					var code = regCode.exec(tab.url);
					if (code && code.length === 2 ) {
						// var takenUrl = feedly.BASE+"/auth/token?code="+code[1]+"&client_id=sandbox&client_secret=A0SXFX54S3K0OC9GNCXG&redirect_uri="+
						// 			   encodeURIComponent("http://localhost")+"&grant_type=authorization_code";
						var takenUrl = feedly.BASE+"/auth/token?code="+code[1]+"&client_id=feedly&client_secret=0XP4XQ07VVMDWBKUHTJM4WUQ&redirect_uri="+
										encodeURIComponent("http://localhost")+"&grant_type=authorization_code";
						var xhr = new XMLHttpRequest();
						xhr.open("POST", takenUrl, true);
						xhr.onload = function() {
							feedly.saveLocalStorage(JSON.parse(this.response));

							chrome.tabs.onUpdated.removeListener(tabOnUpdate);
							chrome.tabs.remove(tabId);
						};
						xhr.send();
					}
				}
			});
		});
	},
	getFreshToken: function() {
		// var url = feedly.BASE+"/auth/token?refresh_token="+feedly.access_token+
		// 					  "&client_id=sandbox&client_secret=A0SXFX54S3K0OC9GNCXG&grant_type=refresh_token";
		var url = feedly.BASE+"/auth/token?refresh_token="+feedly.access_token+
							   "&client_id=feedly&client_secret=0XP4XQ07VVMDWBKUHTJM4WUQ&grant_type=refresh_token";
		var xhr = new XMLHttpRequest();
		xhr.open("POST", url, true);
		xhr.onload = function() {
			if (this.status === 200) {
				feedly.saveLocalStorage(JSON.parse(this.response));
			} else if (this.status === 401) {
				feedly.getToken();
			}
		};
		xhr.send();
	},
	saveLocalStorage: function(json) {
		localStorage.setItem("access_token", json.access_token);
		localStorage.setItem("refresh_token", json.refresh_token);
		localStorage.setItem("token_type", json.token_type);
		localStorage.setItem("id", json.id);
		localStorage.setItem("plan", json.plan);

		access_token = json.access_token;
		refresh_token = json.refresh_token;
		token_type = json.token_type;
		id = json.id;
		plan = json.plan;
	},
	errToken: function() {
		if (feedly.refresh_token !== null) {
			feedly.getFreshToken();
		} else {
			feedly.getToken();
		}
	},
	getProfile: function() {
		if (document.getElementById("welcome").textContent !== "welcome") {
			return;
		}

		var url = feedly.BASE+"/profile";
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, false);
		xhr.setRequestHeader(
			"Authorization", "OAuth " + feedly.access_token
		);
		xhr.onload = function() {
			if (this.status === 200) {
				var resp = JSON.parse(this.response);
				var span = document.getElementById("welcome");
				span.textContent = resp.email;
			} else if(this.status === 401) {
				localStorage.removeItem("access_token");
				localStorage.removeItem("refresh_token");
				location.href = "init.html";
			}
		};
		xhr.send();
	},
	getSubscriptions: function() {
		var url = feedly.BASE+"/subscriptions";
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.setRequestHeader(
			"Authorization", "OAuth " + feedly.access_token
		);
		xhr.onload = function() {
			var json = JSON.parse(this.response);
			var subs = feedly.subscriptions2fastladder(json);
			var tmp = {};
			for (var i = 0, length = subs.length; i < length; i++) {
				tmp[subs[i].subscribe_id] = subs[i];
			}
			feedly.subs = tmp;
		};
		xhr.send();
	},
	subscriptions2fastladder: function(json) {
		var localRate = localStorage.getItem("Rate");
		if (!localRate) localRate = "{}";
		var rate = JSON.parse(localRate);
		var tmp = [];
		for (var i = 0, length = json.length; i < length; i++) {
			var item = json[i];
			var id = item.id.replace(/&amp;/ig,"&"); // feedlyは&amp;を&で格納している？
			var link = item.website || "";
			var sub = {
				// icon: "http://www.google.com/s2/favicons?domain=" + link.split("/").slice(2, 3) + "&alt=feed",
				icon: "http://www.google.com/s2/favicons?domain_url=" + link + "&alt=feed",
				image: item.visualUrl || item.iconUrl || "",
				link: link,
				subscribe_id: id,
				unread_count: 0,
				folder: item.categories.length===0 ? "" : item.categories[0].label,
				folder_id: item.categories.length===0 ? "" : item.categories[0].id,
				tags: [],
				rate: rate[id] ? rate[id] : 0,
				modified_on: item.updated,
				public: 0,
				title: item.title,
				subscribers_count: item.subscribers,
				feedlink: id.replace(/^feed\//i,""),
				velocity: item.velocity,
			};
			tmp.push(sub);
		}
		return tmp;
	},
	pin2fastladder: function(json) {
		var items = json.items;
		var pins = [];
		for (var i = 0, length = items.length; i < length; i++) {
			var item = items[i];
			var pin = {
				link  : item.alternate[0].href,
				title: item.title,
				created_on: item.actionTimestamp,
				id: item.id
			};
			pins.push(pin);
		}
		return pins;
	},
	unreadCount2fastladder: function(json, isAll) {
		feedly.lastUpdated = json.updated;   // 最終未読確認時刻
		var tmp = json.unreadcounts;
		var subs = [];
		for (var i in tmp) {
			var sub = feedly.subs[tmp[i].id];
			if (!sub) continue;
			sub.modified_on = tmp[i].updated;
			sub.unread_count = tmp[i].count;
			if (isAll == false && tmp[i].count === 0) continue;

			subs.push(sub);
		}
		return subs;
	},
	feed2fastladder: function(id, json) {
		var sub = feedly.subs[id];
		var tmp = {
			subscribe_id: sub.subscribe_id,
			last_stored_on: sub.modified_on,
			channel: {
				icon: sub.icon,
				link: sub.link,
				description: "",
				image: sub.image,
				title: sub.title,
				feedlink: sub.feedlink,
				subscribers_count: sub.subscribers_count,
				expires: sub.modified_on,
				rate: sub.rate,
				velocity: sub.velocity,
			}
		};
		var items = [];
		var length = json.items.length;
		for (var i = 0; i < length; i++) {
			var item = json.items[i];
			var alternateUrl = item.alternate ? item.alternate[0].href : null;
			var originUrl = item.origin ? item.origin.htmlUrl : null;
			var content = item.content ? item.content.content : null;
			var summary = item.summary ? item.summary.content : null;
			var body = content || summary || "";
			var keywords = item.keywords ? item.keywords.join(", ") : "";
			var visual = item.visual;
			if (visual && visual.url !== "none" && body.indexOf(visual.url) === -1) {
				body += "<div><img src='" + visual.url + "'/></div>";
			}
			var feed = {
				enclosure: "",
				link: alternateUrl || originUrl || "",
				enclosure_type: "",
				author: item.author || "",
				body:  body,
				created_on: item.published,
				modified_on: item.recrawled ? item.crawled : item.published,
				id: item.id,
				title: item.title,
				category: keywords,
				engagement: item.engagement,   // like
				crawled: item.crawled,
			};
			items.push(feed);
		}

		// 既読処理用feedid
		if (length < 0) sub["tochid"] = json.items[0].id;

		tmp["items"] = items;
		return tmp;
	},
	discover2fastladder: function(json) {
		var tmp = [];
		var list = json.results;
		for (var i = 0, length = list.length; i < length; i++) {
			var item = list[i];
			var subscription = {
				link: item.website,
				title: item.title,
				subscribers_count: item.subscribers,
				feedlink: item.feedId.replace(/^feed\//i,""),
				feedid: item.feedId,
			};
			tmp.push(subscription);
		}
		return tmp;
	},
	categories2fastladder: function(json) {
		var tmp = {};
		var name2id = {};
		var id2name = {};
		var names = [];
		for (var i = 0, length = json.length; i < length; i++) {
			var category = json[i];
			name2id[category.label] = category.id;
			id2name[category.id] = category.label;
			names.push(category.label);
		}
		names.sort();

		tmp["name2id"] = name2id;
		tmp["id2name"] = id2name;
		tmp["names"] = names;
		return tmp;
	},
	saveRate: function() {
		var tmp = {};
		for (var i in feedly.subs) {
			if(feedly.subs[i].rate){
				tmp[i] = feedly.subs[i].rate;
			}
		}
		var data = Object.toJSON(tmp);
		localStorage.setItem("Rate",data);
	},


};