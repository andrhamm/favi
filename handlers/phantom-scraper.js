/* eslint-disable */
var webPage = require ('webpage');
var page = webPage.create ();
var system = require ('system');
var args = system.args;

page.onError = function(msg, trace) {
  // var msgStack = ['ERROR: ' + msg];
  // if (trace && trace.length) {
  //     msgStack.push('TRACE:');
  //     trace.forEach(function(t) {
  //         msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
  //     });
  // }
  // uncomment to log into the console
  // console.error(msgStack.join('\n'));
};

page.open (args[1], function (status) {
  try {
    var favicon = page.evaluate (function () {
      // trim polyfill from SO
      if (!String.prototype.trim) {
        (function () {
          // Make sure we trim BOM and NBSP
          var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
          String.prototype.trim = function () {
            return this.replace (rtrim, '');
          };
        }) ();
      }

      var ico = document.querySelector ("link[rel*='icon'][href*='.ico']");
      if (ico && ico.href) {
        return ico.href.trim ();
      }

      var png = document.querySelector ("link[rel*='icon'][href*='.png']");
      if (png && png.href) {
        return png.href.trim ();
      }

      // TODO: support other kinds of favicon definitions
      // find all links with rel tag containing "icon"
      // var links = document.querySelectorAll ("link[rel*='icon'][href*='.png']");
      //   var ico;
      //   var png;
      //   var other;
      //   for (var index = 0; index < links.length; index++) {
      //     var link = links[index];

      //     if (link.href) {
      //       var parser = document.createElement ('a');
      //       parser.href = link.href;

      //       if (parser.pathname) {
      //         if (!ico && parser.pathname.endsWith ('.ico')) {
      //           ico = link.href;
      //         } else if (!png && parser.pathname.endsWith ('.png')) {
      //           png = link.href;
      //         } else if (!other) {
      //           other = link.href;
      //         }
      //       }
      //     }
      //   }
      //  prefer .ico or .png
      //  return png || ico || other;

      // TODO: figure out how to handle errors
      return '';
    });
    console.log (favicon);
  } catch (error) {
    //   console.error (error);
  }
  console.log("");
  phantom.exit ();
});
