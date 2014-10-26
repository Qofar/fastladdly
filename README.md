# fastladdly

#### フロントエンドfastladderバックエンドfeedlyなChromeApp

> ひととおり動くようにしたつもり、あまり触らない機能はバグありそう


### 注意点

* デベロッパーモード or 拡張機能のパッケージ化をやって使うこと前提
* localhost:80でlistenされてるとOAuth認証が正常にできない(認証後の戻りURLがlocalhost固定のため)
* fastladderのフォルダとレート管理を無理やりfeedly上でやっているので、feedlyのCollection機能でフォルダとレートの2つ以外に所属させることができない
* Tampermonkey等のChromeExtensionは仕様上`chrome-extension://`に適用されないので動かない
* 上記の仕様のためキーカスタマイズや挙動の変更、機能追加、widgets追加などは直接ソースコードを修正追加する必要がある
