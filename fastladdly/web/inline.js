// インラインスクリプトが使えないので力技、あとでなんとかする
var pin_button = document.getElementById("pin_button");
pin_button.onmouseover = function(){Control.pin_hover.call(this,event);};
pin_button.onmouseout = function(){Control.pin_mouseout.call(this,event);};
pin_button.onclick = function(){Control.pin_click.call(this,event);};

var menu_button = document.getElementById("menu_button");
menu_button.onselectstart = function(){return false;};
menu_button.onmousedown = function(){Control.toggle_menu.call(this,event);};

var viewmode_toggle = document.getElementById("viewmode_toggle");
viewmode_toggle.onselectstart = function(){return false;};
viewmode_toggle.onmousedown = function(){ViewmodeToggle.click.call(this,event);return false;};

var sortmode_toggle = document.getElementById("sortmode_toggle");
sortmode_toggle.onmousedown = function(){SortmodeToggle.click.call(this,event);};

var show_all_button = document.getElementById("show_all_button");
show_all_button.onmouseover = function(){show_all_mouseover.call(this,event);};
show_all_button.onmouseout = function(){show_all_mouseout.call(this,event);};
