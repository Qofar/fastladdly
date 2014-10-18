// ==UserScript==
// @name        LDR Full Feed
// @namespace   http://d.hatena.ne.jp/Constellation/
// @include     http://reader.livedoor.com/reader/*
// @include     http://fastladder.com/reader/*
// @description loading full entry on LDR and Fastladder
// @version     0.0.34
// @resource    orange  https://raw.github.com/Constellation/ldrfullfeed/master/orange.gif
// @resource    blue    https://raw.github.com/Constellation/ldrfullfeed/master/blue.gif
// @resource    css     https://raw.github.com/Constellation/ldrfullfeed/master/ldrfullfeed.css
// @author      Constellation
// using [ $X + prefix / createHTML ] (c) id:nanto_vi id:os0x
//       [ relativeToAbsolutePath   ] (c) id:Yuichirou
//       [ filter                   ] copied from LDR-Prefav   (c) id:brazil
//       [ addStyle                 ] copied from LDRize       (c) id:snj14
// thanks
// ==/UserScript==

(function(w){
// XPath 式中の接頭辞のない名前テストに接頭辞 prefix を追加する
// e.g. '//body[@class = "foo"]/p' -> '//prefix:body[@class = "foo"]/prefix:p'
// http://nanto.asablo.jp/blog/2008/12/11/4003371
function addDefaultPrefix(xpath, prefix) {
    var tokenPattern = /([A-Za-z_\u00c0-\ufffd][\w\-.\u00b7-\ufffd]*|\*)\s*(::?|\()?|(".*?"|'.*?'|\d+(?:\.\d*)?|\.(?:\.|\d+)?|[\)\]])|(\/\/?|!=|[<>]=?|[\(\[|,=+-])|([@$])/g;
    var TERM = 1, OPERATOR = 2, MODIFIER = 3;
    var tokenType = OPERATOR;
    prefix += ':';
    function replacer(token, identifier, suffix, term, operator, modifier) {
        if (suffix) {
            tokenType =
                (suffix == ':' || (suffix == '::' && (identifier == 'attribute' || identifier == 'namespace')))
                    ? MODIFIER : OPERATOR;
        } else if (identifier) {
            if (tokenType == OPERATOR && identifier != '*')
                token = prefix + token;
            tokenType = (tokenType == TERM) ? OPERATOR : TERM;
        } else {
            tokenType = term ? TERM : operator ? OPERATOR : MODIFIER;
        }
        return token;
    }
    return xpath.replace(tokenPattern, replacer);
}

// $X on XHTML
// @target Freifox3, Chrome3, Safari4, Opera10
// @source http://gist.github.com/184276.txt
function $X (exp, context) {
    context || (context = document);
    var _document  = context.ownerDocument || context,
        documentElement = _document.documentElement,
        isXHTML = documentElement.tagName !== 'HTML' && _document.createElement('p').tagName === 'p',
        defaultPrefix = null;
    if (isXHTML) {
        defaultPrefix = '__default__';
        exp = addDefaultPrefix(exp, defaultPrefix);
    }
    function resolver (prefix) {
        return context.lookupNamespaceURI(prefix === defaultPrefix ? null : prefix) ||
            documentElement.namespaceURI || "";
    }

    var result = _document.evaluate(exp, context, resolver, XPathResult.ANY_TYPE, null);
    switch (result.resultType) {
        case XPathResult.STRING_TYPE : return result.stringValue;
        case XPathResult.NUMBER_TYPE : return result.numberValue;
        case XPathResult.BOOLEAN_TYPE: return result.booleanValue;
        case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
            // not ensure the order.
            var ret = [], i = null;
            while (i = result.iterateNext()) ret.push(i);
            return ret;
    }
}

function openInTab(url) {
    var a = document.createElement('a');
    a.target = '_blank';
    a.href = url;
    var event = document.createEvent('MouseEvents');
    event.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 1, null);
    a.dispatchEvent(event);
    return true;
}

    // == [Config] ======================================================

    var VERSION = '0.0.34';

    var ICON = 'orange'; // or blue

    var KEY = 'g';
    var GET_SITEINFO_KEY = 'G';
    var GET_ALL = true;
    var GET_ALL_KEY = 'u';

    var ADCHECKER = /(^AD:|^PR:)/;
    var LOADING_MOTION = true;

    var REMOVE_IFRAME = true;
    var DISABLE_HATENAKEYWORD = true;

    var OPEN = false; //SITEINFOになかった場合にそのエントリを開くかどうか
    var ITEMFILTER = true;
    var AUTO_SEARCH = false;
    var EXTRACT_TEXT = false;
    var WIDGET = true;
    var CLICKABLE = false;

    var XHR_TIMEOUT = 30 * 1000;
    //var XHR_TIMEOUT = 15 * 1000;

    var DEBUG = false;
    var FLASH = false;

    var MICROFORMATS = [
        {
            name : 'hAtom-Content',
            xpath: '//*[contains(concat(" ",normalize-space(@class)," "), " hentry ")]//*[contains(concat(" ",normalize-space(@class)," "), " entry-content ")]',
        },
        {
            name : 'hAtom',
            xpath: '//*[contains(concat(" ",normalize-space(@class)," "), " hentry ")]',
        },
        {
            name : 'xFolk',
            xpath: '//*[contains(concat(" ",@class," "), " xfolkentry ")]//*[contains(concat(" ",normalize-space(@class)," "), " description ")]',
        },
        {
            name : 'AutoPagerize(Microformats)',
            xpath: '//*[contains(concat(" ",normalize-space(@class)," "), " autopagerize_page_element ")]',
        },
    ];

    var AUTOPAGERIZE_MICROFORMAT = {
        name:         'autopagerize_microformat',
        url:          '.*',
        reg:          /.*/,
        nextLink:     '//a[@rel="next"] | //link[@rel="next"]',
        insertBefore: '//*[contains(@class, "autopagerize_insert_before")]',
        pageElement:  '//*[contains(@class, "autopagerize_page_element")]',
    };
    // == [Cache Phase] =================================================

    var PHASE = [
        {type:'SBM'                            },
        {type:'INDIVIDUAL',         sub:'IND'  },
        {type:'INDIV_MICROFORMATS'             },
        {type:'SUBGENERAL',         sub:'SUB'  },
        {type:'GENERAL',            sub:'GEN'  },
        {type:'MICROFORMATS',       sub:'MIC'  }
    ];

    // == [Application] =================================================

    // [FullFeed]
    var FullFeed = function(info, c){
        this.data = c;
        this.info = info;
        this.type = 'FullFeed';

        this.requestURL = this.data.itemURL.replace(/&amp;/g, '&');
        var bodyXPath = 'id("item_body_' + this.data.id + '")/div[@class="body"]';
        this.data.item_body = $X(bodyXPath, document)[0];
        this.state = 'wait';
        this.mime = 'text/html; charset=' + (this.info.enc || document.characterSet);
        this.entry = [];

        this.request();
    };

    FullFeed.prototype.request = function(){
        if (!this.requestURL) return;
        this.state = 'request';
        this.xhr = new XMLHttpRequest();
        var self = this;
        message('Loading '+this.type+' ...');
        if (this.data.container.classList.contains('gm_fullfeed_loaded')) {
            this.data.container.classList.toggle('gm_fullfeed_loaded');
        }
        this.data.container.classList.toggle('gm_fullfeed_loading');

        this.xhr.open('get', this.requestURL, true);
        if (this.mime) {
            this.xhr.overrideMimeType = this.mime;
        }
        this.xhr.onload = function(res){
            self.load.call(self, res);
        };
        this.xhr.onerror = function(){
            self.error.call(self, 'FullFeed Request Error');
        };
        this.xhr.send();
    };

    function urlX(url) {
        if (/^(?:https?:\/\/|\.|\/)/.test(url)) {
            return url;
        }
    }

    function idX(id) {
        return id;
    }

    FullFeed.prototype.load = function(res){
        this.state = 'loading';
        // var text = res.responseText;
        var text = this.xhr.responseText;
        var self = this;

        try {
            var htmldoc = createDocumentFromString(text);
            removeXSSRisk(htmldoc);
            if(this.xhr.finalUrl){
                // this.requestURL = res.finalUrl;
                this.requestURL = this.xhr.finalUrl;
                relativeToAbsolutePath(htmldoc, this.requestURL);
            } else {
                relativeToAbsolutePath(htmldoc, this.requestURL);
            }
        } catch(e) {
            return this.error('HTML Parse Error',e);
        }

        //time('FULLFEED: DocumentFilterTime: ');
        FullFeed.documentFilters.forEach(function(f) {
            f(htmldoc, this.requestURL, this.info);
        },this);
        //timeEnd('FULLFEED: DocumentFilterTime: ');
        this['get'+this.type](htmldoc);
    };

    FullFeed.prototype.getFullFeed = function(htmldoc){
        this.entry = [];
        if(this.info.microformats){
            // console.log('FULLFEED: Microformats');
            this.entry = getElementsByMicroformats(htmldoc);
        }

        if(this.entry.length === 0){
            try{
                this.entry = $X(this.info.xpath, htmldoc);
            } catch(e) {
                return this.error('Something is wrong with this XPath');
            }
        }

        if(AUTO_SEARCH && this.entry.length === 0){
            this.entry = searchEntry(htmldoc);
        }

        if(EXTRACT_TEXT && this.entry.length === 0){
            this.entry = extractText(htmldoc);
        }

        this.requestEnd(htmldoc);
    };

    FullFeed.prototype.getAutoPager = function(htmldoc){
        try {
            this.entry = $X(this.info.xpath, htmldoc);
            (this.entry.length === 0) && (this.entry = $X(this.ap.pageElement, htmldoc));
            this.nextLink = $X(this.ap.nextLink, htmldoc);
        } catch(e) {
            this.enable = false;
        }
        this.requestEnd(htmldoc);
    };

    FullFeed.prototype.requestEnd = function(htmldoc){
        var that = this;
        if (this.entry.length > 0) {
            FullFeed.filters.forEach(function(f) { f(that.entry, that.requestURL) });

            this.addEntry();
            this.state = 'loaded';
            message('Loading '+this.type+' ...Done');
            this.data.container.classList.add('gm_fullfeed_loaded');
            this.data.container.classList.toggle('gm_fullfeed_loading');
            this.data.container.classList.toggle(this.requestURL);
        }
        else return this.error('This SITE_INFO is unmatched to this entry');
    };

    FullFeed.prototype.error = function(e){
        this.state = 'error';
        message('Error: ' + e);
        this.data.container.classList.add('gm_fullfeed_error');
        this.data.container.classList.toggle('gm_fullfeed_loading');
    };

    FullFeed.prototype.createSpaceFullFeed = function(){
        var range = document.createRange();
        range.selectNodeContents(this.data.item_body);
        range.deleteContents();
        // range.detach();
        return document.createDocumentFragment();
    };

    FullFeed.prototype.createSpaceAutoPager = function(){
        var p = $CF('<hr/><p class="gm_fullfeed_pager">page <a class="gm_fullfeed_link" href="'+this.requestURL+'">'+(++this.pageNum || (this.pageNum=2))+'</a></p>');
        return p;
    };

    FullFeed.prototype.addEntry = function(){
        var that = this;
        var df = this['createSpace'+this.type]();
        this.entry.forEach(function(e) {
            df.appendChild($CF(sanitize(e)));
        });
        this.entry = null;
        this.data.item_body.appendChild(df);
    };

    FullFeed.prototype.AutoPager = function (){
        if (!this.enable){
            if(this.pageNum>0) return message("cannot AutoPage");
            else return message('This entry has been already loaded.');
        }
        var nextLink = this.nextLink.getAttribute('href') ||
            this.nextLink.getAttribute('action') ||
            this.nextLink.getAttribute('value');
        var base = this.requestURL;
        var resolver = path_resolver(base);
        nextLink = resolver(nextLink);
        this.requestURL = nextLink;
        this.type = 'AutoPager';
        this.request();
    };

    FullFeed.prototype.searchAutoPagerData = function (htmldoc){
        this.enable = false;
        if(this.apList.length>0){
            var nextLink;
            if(!this.ap){
                if( this.apList.some(function(i){
                    if((nextLink = $X(i.nextLink, htmldoc)[0]) &&
                        ($X(i.pageElement, htmldoc).length>0)){
                        this.ap = i;
                        this.enable = true;
                        return true;
                    }
                    return false;
                },this)){
                    this.nextLink = nextLink;
                }
            } else {
                if(nextLink = $X(this.ap.nextLink, htmldoc)[0]){
                    this.enable = true;
                    this.nextLink = nextLink;
                }
            }
        }
    };

    FullFeed.register = function(){
    //     if(!WIDGET) return;
    //     var description = "\u5168\u6587\u53d6\u5f97\u3067\u304d\u308b\u3088\uff01";
    //     w.entry_widgets.add('gm_fullfeed_widget', function(feed, item){
    //         if((Manager.matchPattern(item.link) || Manager.matchPattern(feed.channel.link)) && !ADCHECKER.test(item.title)) {
    //             if(CLICKABLE) return [
    //                 '<img class="gm_fullfeed_icon_disable" id="gm_fullfeed_widget_'+item.id+'" src="img/fullfeed_orange.gif">'
    //             ].join('');
    //             else return [
    //                 '<img src="img/fullfeed_orange.gif">'
    //             ].join('');
    //         }
    //     }, description);
    };


    // API
    FullFeed.documentFilters = [];
    FullFeed.filters= [];
    FullFeed.itemFilters= [];

    window.FullFeed = {
        VERSION: VERSION,
        addItemFilter: function(f){ FullFeed.itemFilters.push(f) },
        addFilter: function(f){ FullFeed.filters.push(f) },
        addDocumentFilter: function(f){ FullFeed.documentFilters.push(f) },
    };

    // [Filters]

    (function(){
        // Filter: Remove Script and H2 tags
        // iframeはどうも要素を作成した時点で読みにいくようなので、textから正規表現で削除
        // なので、SITEINFOはIFRAMEを基準に作成しないでいただけるとありがたい。
        (function(){
            var h2_span = document.createElement('span');
            h2_span.className = 'gm_fullfeed_h2';
            window.FullFeed.addFilter(function(nodes, url){
                filter(nodes, function(e){
                    var n = e.nodeName.toLowerCase();
                    if(n === 'script' || n === 'h2') return false;
                    return true;
                });
                nodes.forEach(function(e){
                    $X('descendant-or-self::*[self::script or self::h2]', e)
                        .forEach(function(i){
                            var n = i.nodeName.toLowerCase();
                            var r = h2_span.cloneNode(false);
                            if(n === 'script') i.parentNode.removeChild(i);
                            if(n === 'h2'){
                                $A(i.childNodes).forEach(function(child){ r.appendChild(child.cloneNode(true)) });
                                i.parentNode.replaceChild(r, i);
                            }
                        });
                });
            });
        })();
        // Filter: Remove Particular Class
        // LDR 自体が使っているclassを取り除く。とりあえずmoreだけ。
        // ほかにもあれば追加する。
        (function(){
            window.FullFeed.addFilter(function(nodes, url){
                nodes.forEach(function(e){
                    $X('descendant-or-self::*[contains(concat(" ",@class," ")," more ")]', e)
                        .forEach(function(i){
                            i.classList.remove('more');
                        });
                });
            });
        })();
        // Filter: Disable Hatena Keyword
        (function(){
            if(DISABLE_HATENAKEYWORD){
                var reg = /(^http:\/\/d\.hatena\.ne\.jp|^http:\/\/.+?.g\.hatena\.ne\.jp\/bbs|^http:\/\/(.)*?\.g\.hatena.ne\.jp\/|^http:\/\/anond\.hatelabo\.jp\/)/;
                var span = document.createElement('span');
                span.className = 'keyword';
                window.FullFeed.addFilter(function(nodes, url){
                    if(!reg.test(url)) return;
                    nodes.forEach(function(e){
                        var keywords = $X('descendant-or-self::a[(@class="keyword") or (@class="okeyword")]', e);
                        if(keywords){
                            keywords.forEach(function(key){
                                var r = span.cloneNode(false);
                                $A(key.childNodes).forEach(function(child){ r.appendChild(child.cloneNode(true)) });
                                key.parentNode.replaceChild(r, key);
                            });
                        }
                    });
                });
            }
        })();
    })();

    // [Cache]

    var Cache = function(manager){
        var self = this;
        this.manager = manager;
        manager.state = 'loading';
        this.ldrfullfeed  = {};
        this.autopagerize = [AUTOPAGERIZE_MICROFORMAT];
        this.success = 0;
        this.error_flag = false;
        this.error_flag || message('Resetting cache. Please wait...');

        PHASE.forEach(function(i){
            this.ldrfullfeed[i.type] = [];
        }, this);
    };

    Cache.prototype.finalize = function(){
        var manager = this.manager;
        PHASE.forEach(function(p){
            this.ldrfullfeed[p.type].sort(function(a,b){
                return a.urlIndex - b.urlIndex;
            });
        }, this);
        manager.info = {
            VERSION      : VERSION,
            ldrfullfeed  : this.ldrfullfeed,
            autopagerize : this.autopagerize
        };
        var serialized = JSON.stringify(manager.info);
        try {
            w.localStorage.setItem("fullfeedCache", serialized);
        } catch (e) {
            // console.log("save error", e);
        }
        this.error_flag || message('Resetting cache. Please wait... Done');
        manager.state = 'normal';
        if(WIDGET) manager.createPattern();
        PHASE.forEach(function(i){
            var fullfeed_list = manager.info.ldrfullfeed[i.type];
            fullfeed_list.forEach(function(data){
                data.reg = new RegExp(data.url);
            });
        });
    };

    Cache.prototype.error = function(e){
        this.error_flag || message('Cache Error: '+e);
        this.error_flag = true;
        this.manager.state = 'normal';
    };

    // [Manager]
    var Manager = {
        info: null,
        patterns: [],
        state: 'normal',
        init: function(){
            var self = this;
            this.getSiteinfo();
            this.rebuildLocalSiteinfo();
            if(WIDGET) this.createPattern();
            // if(LOADING_MOTION) addStyle(CSS, 'gm_fullfeed_style');
            // GM_registerMenuCommand('LDR Full Feed - reset cache', function(){ self.resetSiteinfo.call(self)});
            var id = setTimeout(function(){
                if (id) clearTimeout(id);
                if (typeof w.Keybind != 'undefined' && typeof w.entry_widgets != 'undefined') {
                    w.Keybind.add(KEY, function(){
                        self.loadCurrentEntry();
                    });

                    if(GET_ALL)
                        w.Keybind.add(GET_ALL_KEY, function(){
                            self.loadAllEntries();
                        });

                    w.Keybind.add(GET_SITEINFO_KEY, function() {
                        self.resetSiteinfo();
                    });

                    if(WIDGET) FullFeed.register();
                } else {
                    id = setTimeout(arguments.callee, 100);
                }
            }, 0);
        },
        getSiteinfo: function(){
            var str = w.localStorage.getItem("fullfeedCache");
            if(str){
                try{
                    this.info = JSON.parse(str);
                } catch(e){
                    this.info = null;
                }
            }
            if(!this.info || !this.info.VERSION || (this.info.VERSION < VERSION)){
                var t = {};
                PHASE.forEach(function(i){t[i.type] = []});
                this.info = {
                    ldrfullfeed  :  t,
                    autopagerize : [AUTOPAGERIZE_MICROFORMAT],
                    VERSION      : VERSION
                };
                this.resetSiteinfo();
            } else {
                PHASE.forEach(function(i){
                    var fullfeed_list = this.info.ldrfullfeed[i.type];
                    fullfeed_list.forEach(function(data){
                        data.reg = new RegExp(data.url);
                    });
                }, this);
            }
        },
        resetSiteinfo: function(){
        },
        rebuildLocalSiteinfo: function(){
            this.siteinfo = SITE_INFO
                .map(function(data){
                    data.urlIndex = -1;
                    data.reg = new RegExp(data.url);
                    return data;
                });
        },
        createPattern: function(){
            var exps = [];
            this.siteinfo && this.siteinfo.forEach(function(i){
                exps.push(i.url);
            });
            // if(this.info && this.info.ldrfullfeed){
            //     for each (var i in this.info.ldrfullfeed) {
            //         i.forEach(function(info) {
            //             exps.push(info.url);
            //         });
            //     }
            // }
            var len = exps.length;
            if (len > 100) {
                var item = len / 3 | 0;
                this.patterns[0] = new RegExp(exps.slice(0, item).join('|'));
                this.patterns[1] = new RegExp(exps.slice(item, item+item).join('|'));
                this.patterns[2] = new RegExp(exps.slice(item+item).join('|'));
            } else if (len) {
                this.patterns[0] = new RegExp(exps.join('|'));
            }
        },
        matchPattern: function(text){
            return this.patterns.some(function(pattern){
                return pattern && pattern.test(text);
            });
        },
        loadCurrentEntry: function(){
            this.check();
        },
        loadAllEntries: function(){
            var items = w.get_active_feed().items;
            if (items && items.length > 0)
                items.forEach(function(item){ this.check(item.id) }, this);
        },
        check: function(id){
            var c = (id) ? new this.getData(id) : new this.getData();
            if(!c) return;
            if(ITEMFILTER){
                FullFeed.itemFilters.forEach(function(f) {
                    f(c);
                });
            }

            if(ADCHECKER.test(c.title))
                return message('This entry is advertisement');
            if(c.container.classList.contains('gm_fullfeed_loaded')){
                return message('This entry has been already loaded.');
            }
            if(c.container.classList.contains('gm_fullfeed_loading'))
                return message('Now loadig...');

            if(!c.item.fullfeed){
                var fullfeed_list = this.info.ldrfullfeed;
                this.launchFullFeed(this.siteinfo, c);
                // console.log('PHASE: LOCAL SITEINFO');
                if(!c.found && !PHASE.some(function(i){
                    // console.log('PHASE: ' + i.type);
                    this.launchFullFeed(fullfeed_list[i.type], c);
                    return c.found;
                }, this)){
                    message('This entry is not listed on SITE_INFO');
                    if (OPEN) openInTab(c.itemURL) || message('Cannot popup');
                }
            }
        },
        // data format
        //
        //   itemURL
        //   feedURL
        //   id
        //   title
        //   container
        //   title
        //   item           <-- unsafe item
        //   found
        //
        //   create safe item
        getData: function(id){
            if(!id && w.get_active_item(true)) var id = w.get_active_item(true).id;
            if(!id) return;
            var feed = w.get_active_feed();

            this.item = w.get_item_info(id);
            this.itemURL = this.item.link;
            this.feedURL = feed.channel.link;
            this.id = this.item.id;
            this.container = w.$('item_' + this.id);
            this.title = this.item.title;
            this.found = false;
        },
        launchFullFeed: function(list, c){
            if (typeof list.some != "function") return;
            var item_url = c.itemURL;
            var feed_url = c.feedURL;
            list.some(function(data) {
                if (data.reg.test(item_url) || data.reg.test(feed_url)) {
                    c.found = true;
                    new FullFeed(data, c);
                    return true;
                } else {
                    return false;
                }
            });
        }
    };

    // main
    Manager.init();



    // == [Utility Functions] ===========================================

    function message (mes){
        w.message(mes);
    }

    function $CF(text){
        return $CF.range.createContextualFragment(text);
    }
    $CF.range = document.createRange();
    $CF.range.selectNode(document.body);

    function $A(a){
        return Array.prototype.slice.call(a);
    }
    function getElementsByMicroformats (htmldoc) {
        var t;
        MICROFORMATS.some(function(i){
            t = $X(i.xpath, htmldoc)
            if(t.length>0){
                // console.log('FULLFEED: Microformats :' + i.name);
                return true;
            }
            else return false;
        });
        return t;
    }

    function removeXSSRisk (htmldoc){
        var attr = "allowscriptaccess";
        $X("descendant-or-self::embed", htmldoc)
            .forEach(function(elm){
                if(!elm.hasAttribute(attr)) return;
                elm.setAttribute(attr, "never");
            });
        $X("descendant-or-self::param", htmldoc)
            .forEach(function(elm){
                if(!elm.getAttribute("name") || elm.getAttribute("name").toLowerCase().indexOf(attr) < 0) return;
                elm.setAttribute("value", "never");
            });
    }

    function extractText (htmldoc) {
        var div = document.createElement('div');
        $X('(descendant-or-self::text()[../self::*[self::div or self::table or self::td or self::th or self::tr or self::dt or self::dd or self::font or self::strong or self::ul or self::li]]|descendant-or-self::img|descendant-or-self::a)', htmldoc)
            .map(function(i){
                if(i.nodeName === 'IMG')
                    return i;
                else if(i.nodeName === 'A')
                    return i;
                else{
                    i.nodeValue = i.nodeValue+'\n'
                    return i;
                }
            })
            .forEach(function(i){
                div.appendChild(i);
            });
        div.innerHTML = div.innerHTML
            .replace(/(?:(\r\n|\r|\n)\s*)+/g,'<br>$1');
        return [div];
    }

    function searchEntry(htmldoc) {
        var max = 0;
        var entry = [];
        var data;
        var xpath = [
            '(//div|//td|//table|//tbody)',
            '[(..//h2) or (.//h3) or (.//h4) or (.//h5) or (.//h6) or (..//*[contains(concat(@id,@class,""),"title")])]',
            // '[(.|.//*|ancestor-or-self::*)contains(concat(@id,@class,""),"entry")) or (contains(concat(@id,@class,""),"section")) or (contains(concat(@id,@class,""),"content")) or (contains(concat(@id,@class,""),"main")) or (contains(concat(@id,@class,""),"day")) or (contains(concat(@id,@class,""),"article"))]]',
            '[not(.//form|ancestor-or-self::form)]',
            '[not((.|.//*|ancestor-or-self::*)contains(concat(" ",@class," ")," robots-nocontent ")])]',
            '[not((.|.//*|ancestor-or-self::*)starts-with(concat(@id,@class,""),"side")])]',
            '[not((.|.//*|ancestor-or-self::*)starts-with(concat(@id,@class,""),"navi")])]',
            '[not((.|.//*|ancestor-or-self::*)starts-with(concat(@id,@class,""),"footer")])]',
            '[not((.|.//*|ancestor-or-self::*)starts-with(concat(@id,@class,""),"header")])]',
            '[not(.//script|ancestor-or-self::script)]',
        ].join('');
        try {
            var elms = $X(xpath, htmldoc);
            if(elms.length === 0) return entry;
            elms.forEach(function(e){
                // var n = e.getElementsByTagName('br').length;
                var n = e.textContent.length;
                if(max < n){
                    max = n;
                    data = e;
                }
            });
            entry.push(data);
            return entry;
        }catch (e){
            return [];
        }
    }

    function relativeToAbsolutePath(htmldoc, base){
        var resolver = path_resolver(base);

        var links = $X("descendant-or-self::a", htmldoc)
        for (var i = 0, len = links.length; i < len; i++) {
            var elm = links[i];
            if(elm.getAttribute("href")) elm.href = resolver(elm.getAttribute("href"));
        }

        var imgs = $X("descendant-or-self::img", htmldoc)
        for (var i = 0, len = imgs.length; i < len; i++) {
            var elm = imgs[i];
            if(elm.getAttribute("src")) elm.src = resolver(elm.getAttribute("src"));
        }

        var embeds = $X("descendant-or-self::embed", htmldoc)
        for (var i = 0, len = embeds.length; i < len; i++) {
            var elm = embeds[i];
            if(elm.getAttribute("src")) elm.src = resolver(elm.getAttribute("src"));
        }

        var objcts = $X("descendant-or-self::object", htmldoc)
        for (var i = 0, len = objcts.length; i < len; i++) {
            var elm = objcts[i];
            if(elm.getAttribute("data")) elm.data = resolver(elm.getAttribute("data"));
        }
    }

    // function path_resolver(base){
    //     var XHTML_NS = "http://www.w3.org/1999/xhtml"
    //     var XML_NS   = "http://www.w3.org/XML/1998/namespace"
    //     var a = document.createElementNS(XHTML_NS, 'a')
    //     a.setAttributeNS(XML_NS, 'xml:base', base)
    //     return function(url){
    //         a.href = url;
    //         console.log("path_resolver",url,a.href);
    //         return a.href;
    //     }
    // }
    // FullFeed for Chrome™ - Chrome ウェブストア
    // https://chrome.google.com/webstore/detail/fullfeed-for-chrome/hdcaeobehcekfkhjlkdlipnkmhgfcdpb
    function path_resolver(base) {
        var top = base.match(/^https?:\/\/[^\/]+/)[0];
        var current = base.replace(/\/[^\/]+$/, '/');
        return function(url) {
            if (url.match(/^https?:\/\//)) {
                return url;
            } else if (url.indexOf("/") === 0) {
                return top + url;
            } else {
                var result = current;
                if (url.indexOf(".") === 0) {
                    var count = 15; // 無限ループ防止用. 15回も../や./使ってるURLはさすがにないだろということで.
                    while (url.indexOf(".") === 0 && !(--count === 0)) {
                        if (url.substring(0, 3) === "../")
                            result = result.replace(/\/[^\/]+\/$/, "/");
                        url = url.replace(/^\.+\/?/, "")
                    }
                }
                return result + url;
            }
        }
    }

    function filter(a, f) {
        for (var i = a.length; i --> 0; f(a[i]) || a.splice(i, 1));
    }

    function addStyle(css,id){ // GM_addStyle is slow
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'data:text/css,' + escape(css);
        document.documentElement.childNodes[0].appendChild(link);
    }

    // via http://github.com/hatena/hatena-bookmark-xul/blob/master/chrome/content/common/05-HTMLDocumentCreator.js
    // a little modified
    function createDocumentFromString(source){
        var doc = document.cloneNode(false);
        doc.appendChild(doc.importNode(document.documentElement, false));
        var range = doc.createRange();
        range.selectNodeContents(doc.documentElement);
        var fragment = range.createContextualFragment(source);
        var headChildNames = {title: true, meta: true, link: true, script: true, style: true, /*object: true,*/ base: true/*, isindex: true,*/};
        var child, head = doc.getElementsByTagName('head')[0] || doc.createElement('head'),
            body = doc.getElementsByTagName('body')[0] || doc.createElement('body');
        while ((child = fragment.firstChild)) {
            if (
                (child.nodeType === doc.ELEMENT_NODE && !(child.nodeName.toLowerCase() in headChildNames)) ||
                    (child.nodeType === doc.TEXT_NODE &&/\S/.test(child.nodeValue))
                )
                break;
            head.appendChild(child);
        }
        body.appendChild(fragment);
        doc.documentElement.appendChild(head);
        doc.documentElement.appendChild(body);
        return doc;
    }

    // http://d.hatena.ne.jp/os0x/20080228/1204210085
    // a little modified
    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    function sanitize(node) {
        if (node.nodeType !== 1 && node.nodeType !== 3) {
            return;
        }
        var contents = Array.prototype.slice.call(node.childNodes).reduce(function(memo, node) {
            var content = sanitize(node);
            if (content) {
                memo.push(content);
            }
            return memo;
        }, []);
        if (node.nodeType === 1) {
            // white list
            var tag = node.tagName;
            var attr = (function attrCollector() {
                var res = [''];
                switch (tag.toUpperCase()) {
                    case 'H2':
                        tag = 'H3';
                        break;
                    case 'IMG':
                        if (/^(?:https?:\/\/|\.|\/)/.test(node.src)) {
                            res.push('src=' + JSON.stringify(node.src));
                        }
                        if (node.alt || node.title) {
                            res.push('alt=' + JSON.stringify(node.alt || node.title));
                        }
                        break;
                    case 'A':
                        if (/^(?:https?:\/\/|\.|\/)/.test(node.href)) {
                            res.push('href='+ JSON.stringify(node.href));
                        }
                        if (node.alt || node.title) {
                            res.push('alt=' + JSON.stringify(node.alt || node.title));
                        }
                        res.push('target="_blank"');
                        break;
                };
                return res.join(' ');
            })();
            tag = escapeHTML(tag);
            return '<' + tag + ' ' + attr + '>' + contents.join('') + '</' + tag + '>';
        } else if (node.nodeType === 3) {
            return escapeHTML(node.nodeValue);
        }
    }

})(window);
