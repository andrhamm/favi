var webPage = require('webpage');
var page = webPage.create();
var system = require('system');
var args = system.args;

page.open(args[1], function(status) {
  var favicon = page.evaluate(function() {
    return document.querySelector("link[rel*='icon']").href;
  });

  console.log(favicon);
  phantom.exit();
});