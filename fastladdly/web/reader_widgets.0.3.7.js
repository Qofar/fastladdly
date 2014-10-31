/*
 reader widgets
*/
function setup_widgets(){
	channel_widgets.sep = "&nbsp;&nbsp;|&nbsp;&nbsp;"
	entry_widgets.sep = "";

	entry_widgets.add('created_on', function(feed, item){
		return 'posted: ' + new DateTime(item.created_on).toString();
	});

	entry_widgets.add('modified_on', function(feed, item){
		if(item.created_on == item.modified_on) return;
		return 'modified: ' + new DateTime(item.modified_on).toString();
	});

	entry_widgets.add('crawled_on', function(feed, item){
		return 'crawled: ' + new DateTime(item.crawled).toString();
	});

	entry_widgets.add('feedly_share', function(feed, item){
		return item.engagement ? 'share: ' + item.engagement : "";
	});

	entry_widgets.add('subs_button', function(feed, item){
		var channel_domain = get_domain(feed.channel.link);
		var subs_button = function(url){
			return '<a href="' + url + '" rel="discover">add</a>';
		};
		return (channel_domain != get_domain(item.link)) ? subs_button(item.link) : "";
	});

	channel_widgets.add('offset', function(feed, items){
		var subscribe_id = feed.subscribe_id;
		var info = subs_item(subscribe_id);
		var size = items.length;
		var range,range_text;
		if(State.viewrange.start == 0){
			range_text = "Updated";
			range = ""
		} else {
			range_text = "Archived";
			range = (State.viewrange.start + 1) + "-" + State.viewrange.end;
		}
		return	[
			'<span style="background:url(\'',info.icon,'\') no-repeat 0 0;padding-left:22px">',
			,range_text,': ',range,
			,' <span class="num"><span id="scroll_offset"></span>',size,'</span> entry</span>'
		].join("");
	});

	channel_widgets.add('subscriber', function(feed){
		return [
			'<span class="subscriber" style="background:url(\'img/icon/subscriber.gif\') no-repeat 0 0;padding-left:22px">',
			'<span class="num">', feed.channel.subscribers_count, '</span> users</span>'
		].join("");
	});

	channel_widgets.add('velocity', function(feed){
		return [
			'<span>velocity: </span>',
			'<span class="num">', feed.channel.velocity, '</span>'
		].join("");
	});

	channel_widgets.add('about', function(feed, items){
		return '<a href="/about/'+feed.channel.feedlink+'" style="background-image:url(img/icon/about.gif);background-position:0 0;background-repeat:no-repeat;padding:0 0 4px 20px;">about feed</a>';
	});

	// channel_widgets.add('touch_button', function(feed){
	// 	if(Config.touch_when != "manual") return;
	// 	return [
	// 		"<span class='button' onclick='touch_all(\"",feed.subscribe_id,"\")'>mark as read</span>"
	// 	].join("");
	// });


	// ==UserScript==
	// @name           LDR_ad_entry_blocker_mod.user.js
	// @namespace      http://d.hatena.ne.jp/edvakf/
	// @description    Remove ad items
	// @include        http://reader.livedoor.com/reader/
	// @grant          unsafeWindow
	// ==/UserScript==
	/////////////// configurations ////////////////
	(function(){
		var cfg = {
		  // judgement patterns of entry title
		  patterns: [/^[\s【\[]*(AD|PR|ＡＤ|ＰＲ)[\s】\]]*[:：]/i, /^\s*[【\[]\s*(AD|PR|ＡＤ|ＰＲ)\s*[】\]]/i],
		  // advertisement entries style (apply this style to title link <a>)
		  style: ['color:#aaa;','font-size:12px;'],
		  // skip ad-entry
		  skip: true
		};
		///////////////////////////////////////////////
		LDR_addStyle('.item.blocked h2 > a',cfg.style);
		LDR_addStyle('.item.blocked > .padding > :not(.item_header)',['display:none;']);// for non-IE
		entry_widgets.add('ad_entry_block', function(feed, item){
			if(cfg.patterns.some(function(re){return re.test(item.title)})){
				setTimeout(function() {
					var elm = document.getElementById("item_" + item.id);
					addClass(elm,'blocked');
				}, 100);
				return '';
			}
		}, 'LDR Ad-Entry Blocker');
		addEventListener('load',function(){
			var j_func = Keybind._keyfunc['j'];
			Keybind.add('j|enter', function(){
				j_func();
				if(Control.next_item_offset()==null) return;
				var info = get_active_item(true);
				hasClass(info.element.parentNode.parentNode.parentNode, 'blocked') && arguments.callee() ;
			});
			var k_func = Keybind._keyfunc['k'];
			Keybind.add('k|shift+enter', function(){
				k_func();
				var info = get_active_item(true);
				hasClass(info.element.parentNode.parentNode.parentNode, 'blocked')
				&& ( (Control.prev_item_offset()==null)? k_func() : arguments.callee() );
			});
		},false);
	})();


	// ==UserScript==
	// @name        LDR_TextLink
	// @include     http://reader.livedoor.com/reader/*
	// @version     0.1
	// ==/UserScript==
	(function(){
		// URL 表現を拾うための正規表現
		// var RE_URL = /(?:h?t)?(tps?:\/\/[^/\s]+|[a-z]+\.hatena\.ne\.jp)((\/[A-Za-z0-9!-/:;=?@_~]*)?)/i;
		var RE_URL = /(?:h?t)?(tps?:\/\/[^/\s]+)((\/[A-Za-z0-9!-/:;=?@_~]*)?)/i;

		// プロトコルを補完するときに、どちらのタイプに引っかかったかを判定するための正規表現
		var RE_TPS = /^tps?:\/\//i;

		// TextNode を url を指すアンカータグで置き換える
		function txt2anchor(txt, url) {
			var anchor = txt.ownerDocument.createElement("a");
			anchor.href = url;
			anchor.target = "_blank";
			anchor.innerHTML = txt.nodeValue;
			txt.parentNode.replaceChild(anchor, txt);
		}
		// TextNode 中に URL を指す表現があるかどうかを探し、アンカータグに置き換えてゆく
		function url2link(txt) {
			var result = RE_URL.exec(txt.nodeValue);
			if (result) {
				var middlebit = txt.splitText(result.index);
				var endbit = middlebit.splitText(result[0].length);
				var url;
				if (RE_TPS.test(result[1])) {
					url = 'ht' + result[1] + result[2];
				} else {
					url = 'http://' + result[1] + result[2];
				}
				txt2anchor(middlebit, url);
				return url2link(endbit);
			}
			return txt.nextSibling;
		}
		// DOM をたどって、URL を指す表現をアンカータグに置き換えてゆく
		function url2link_walk_element(ele) {
			var e = ele.firstChild;
			while (e) {
				if (e.nodeType == 3) {
					e = url2link(e);
				} else {
					if (e.nodeType == 1 && e.tagName != "A") {
						url2link_walk_element(e);
					}
					e = e.nextSibling;
				}
			}
		}
		entry_widgets.add('Textlink', function(feed, item) {
			setTimeout(function() {
				var elm = document.getElementById("item_body_" + item.id);
				if(elm) url2link_walk_element(elm);
			}, 100);
			return '';
		}, "TextLink");
	})();


	// ==UserScript==
	// @name        LDR_gbsaver
	// @description Save pins into Google Bookmarks
	// @namespace   http://ma.la/
	// @include     http://reader.livedoor.com/reader/*
	// @version     1.0.2
	// ==/UserScript==
	// http://la.ma.la/blog/diary_200605070200.htm
	// (function(w){
	// 	var enable_p = true;
	// 	var enable_v = true;

	// 	var regex = /<smh:signature>(.+)<\/smh:signature>/;
	// 	var sig = "";

	// 	// customize your label
	// 	function make_label(){
	// 		// yyyy-mm
	// 		var dt = new Date;
	// 		var year  = dt.getFullYear();
	// 		var month = dt.getMonth() + 1;
	// 		var day   = dt.getDate();
	// 		function zerofill(num){
	// 			return num < 10 ? "0"+num : num;
	// 		}
	// 		month = zerofill(month);
	// 		day   = zerofill(day);
	// 		var ym = [year, month].join("-");

	// 		// folder
	// 		var folder = w.subs_item(w.State.now_reading).folder;

	// 		return ["LDR",folder,ym].join(",");
	// 	}

	// 	// get sig
	// 	function get_Sig(){
	// 		var xhr = new XMLHttpRequest();
	// 		xhr.open("GET", "https://www.google.com/bookmarks/lookup?output=rss&num=10", false);
	// 		xhr.onload = function(res){
	// 			if(xhr.status === 200 && xhr.responseText.match(regex)){
	// 				sig = new String(RegExp.$1);
	// 			}else{
	// 				w.message("Google Bookmarks - not login...");
	// 			}
	// 		};
	// 		xhr.onerror = function(res){
	// 			w.message("Google Bookmarks Error - " + xhr.status + " " + xhr.statusText);
	// 		};
	// 		xhr.send();
	// 	}
	// 	get_Sig();

	// 	// init
	// 	function add_link(){with(w){
	// 		var buttons = $("control_buttons").getElementsByTagName("ul")[0];
	// 		var li = document.createElement("li");
	// 		li.className = "button icon";
	// 		li.innerHTML = [
	// 			'<a href="http://www.google.com/bookmarks/" target="_blank">',
	// 			'<img src="http://www.google.com/favicon.ico" title="GoogleBookmarks" border="none" style="width: 16px; height: 16; padding-top: 3px;">',
	// 			'</a>'
	// 		].join("");
	// 		buttons.appendChild(li)
	// 	}}
	// 	add_link();

	// 	addEventListener('load',function(){
	// 		if(enable_p){
	// 			var pin_add = w.pin.add;
	// 			w.pin.add = function(url,title){
	// 				if(this.has(url)) return;
	// 				// url = url.replace(/#.*$/, '');
	// 				gb.save(url, title, make_label());
	// 				pin_add.apply(this, arguments);
	// 			};
	// 		}
	// 		if(enable_v){
	// 			var vo = w.Control.view_original;
	// 			w.Control.view_original = function(){
	// 				vo.apply(this, arguments);
	// 				var item = w.get_active_item(true);
	// 				if(!item) return;
	// 				var url = item.link;
	// 				var title = item.title;
	// 				// url = url.replace(/#.*$/, '');
	// 				gb.save(url, title, make_label());
	// 			};
	// 		}
	// 	},false);

	// 	function GBSaver(logger){
	// //		this.action = 'https://www.google.com/bookmarks/mark';
	// 		logger = logger || function(){};
	// 		function form_encode(param){
	// 			var buf = [];
	// 			for(var key in param){
	// 				var value = param[key];
	// 				buf.push(
	// 					encodeURIComponent(key)+"="+
	// 					encodeURIComponent(value)
	// 				)
	// 			}
	// 			return buf.join("&");
	// 		}
	// 		this.save = function(url,title,label){
	// 			logger("sending private data to Google ... ");
	// 			var postdata = form_encode({
	// 				sig: sig,
	// 				bkmk:   url,
	// 				title:  title,
	// 				labels: label,
	// 				prev: "/lookup"
	// 			});
	// 			try {
	// 				var xhr = new XMLHttpRequest();
	// 				xhr.open("POST", "https://www.google.com/bookmarks/mark", false);
	// 				xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	// 				xhr.onload = function(res){
	// 					console.log(xhr);
	// 					if(xhr.status === 200 && xhr.responseText.indexOf(item.link) > -1){
	// 						w.message("Google Bookmarks - " + item.title);
	// 					}else{
	// 						w.message("Google Bookmarks... Failed - please retry later.");
	// 						get_Sig();
	// 					}
	// 				};
	// 				xhr.onerror = function(res){
	// 					w.message("Google Bookmarks Error - " + xhr.status + " " + xhr.statusText);
	// 				};
	// 				xhr.send(postdata);
	// 			}catch(e){}
	// 		}
	// 	}
	// 	var gb = new GBSaver(w.message);
	// })(window);






}
setup_widgets();
/* just a example:
	entry_widgets.add('clip_counter', function(feed, item){
		var link = item.link.replace(/#/g,'%23');
		var link_encoded = encodeURIComponent(item.link);
		var tmpl = [
			'http://clip.livedoor.com/clip/add?',
			'mode=confirm&title=[[title]]&link=[[url]]&tags=[[tags]]&public=[[public]]'
		].join("");
		var add_link = tmpl.fill({
			url   : encodeURIComponent(item.link.unescapeHTML()),
			title : encodeURIComponent(item.title.unescapeHTML()),
			tags  : Config.clip_tags,
			"public" : Config.use_clip_public
		});
		return [
			'<a href="', add_link, '">','<img src="http://parts.blog.livedoor.jp/img/cmn/clip_16_12_w.gif" border=0></a>',
			'<a href="http://clip.livedoor.com/page/', link, '">',
			'<img style="border:none;margin-left:3px" ',
			'src="http://image.clip.livedoor.com/counter/', link, '">','</a>'
		].join('');
	});

	entry_widgets.add('hb_counter', function(feed, item){
		var link = item.link.replace(/#/g,'%23');
		return [
			'<a href="http://b.hatena.ne.jp/entry/', link, '">',
			'<img src="http://d.hatena.ne.jp/images/b_entry.gif" border=0><img style="border:none;margin-left:3px;" ',
			'src="http://b.hatena.ne.jp/entry/image/',link, '"></a>'
		].join('');
	}, 'はてなブックマークにブックマークされている件数です');

	channel_widgets.add('feedlink', function(feed, items){
		return '<a href="'+feed.channel.feedlink+'"><img src="/img/icon/feed.gif" border=0 style="vertival-align:middle"></a>';
	});

	channel_widgets.add('hb_counter', function(feed){
		return [
			'<a href="http://b.hatena.ne.jp/entrylist?url=', feed.channel.link, '">',
			'<img style="vertical-align:middle;border:none;" src="http://b.hatena.ne.jp/bc/', feed.channel.link, '">',
			'</a>'
		].join("");
	});
*/

