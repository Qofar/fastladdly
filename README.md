# fastladdly

#### フロントエンドfastladderバックエンドfeedlyなChromeApp

> ひととおり動くようにしたつもり、あまり触らない機能はバグありそう

> fastladderのソースコードだと一部挙動が違ったのでlivedoor Readerのソースコード使っている、怒られたら消す


### 注意点

* デベロッパーモード or 拡張機能のパッケージ化をやって使うこと前提
* localhost:80でlistenされてるとOAuth認証が正常にできない(認証後の戻りURLがlocalhost固定のため)
* fastladderのフォルダとレート管理を無理やりfeedly上でやっているので、feedlyのCollection機能でフォルダとレートの2つ以外に所属させることができない
* Tampermonkey等のChromeExtensionは仕様上`chrome-extension://`に適用されないので動かない
* 上記の仕様のためキーカスタマイズや挙動の変更、機能追加、widgets追加などは直接ソースコードを修正追加する必要がある


### 既知の不具合

* 初回起動時など設定が保存されていない状態では正常に動作しないので、認証後は設定画面から設定保存をおこない一度ウィンドウを閉じて開き直せば正常に動く


### Thanks
* [fastladder](https://github.com/fastladder/fastladder)
* [livedoor Reader](http://reader.livedoor.com/reader/)
* [FastladderのバックエンドをFeedlyにするフォークを作った](http://laiso.hatenablog.com/entry/2014/10/12/Fastladder%E3%81%AE%E3%83%90%E3%83%83%E3%82%AF%E3%82%A8%E3%83%B3%E3%83%89%E3%82%92Feedly%E3%81%AB%E3%81%99%E3%82%8B%E3%83%95%E3%82%A9%E3%83%BC%E3%82%AF%E3%82%92%E4%BD%9C%E3%81%A3%E3%81%9F)
