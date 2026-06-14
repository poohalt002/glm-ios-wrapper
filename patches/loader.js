// FILE: patches/loader.js
// ============================================
// Main Loader - Injects Transpiler & Catches Scripts
// ============================================

(function() {
  var iosMatch = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  var iosVersion = iosMatch ? iosMatch[1] + "." + iosMatch[2] : "15.0";
  
  console.log("[Loader] iOS version:", iosVersion);
  
  if (typeof window.LegacyTranspiler === "undefined") {
    console.error("[Loader] LegacyTranspiler not loaded!");
    return;
  }
  
  window.LegacyTranspiler.init({
    BASE_URL: window.location.origin,
    runScript: function(code) {
      try {
        var script = document.createElement("script");
        script.textContent = code;
        document.documentElement.appendChild(script);
        script.remove();
      } catch(e) {
        console.error("[Transpiler] Failed:", e);
        if (window.__debugConsole) {
          window.__debugConsole.log("[ERROR] Transpiler: " + e.message);
        }
      }
    },
    target: {
      platform: "iOS",
      version: iosVersion
    },
    minify: false
  });
  
  var processedScripts = new Set();
  
  var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      for (var j = 0; j < mutation.addedNodes.length; j++) {
        var node = mutation.addedNodes[j];
        
        if (node.tagName === "SCRIPT" && node.src && !processedScripts.has(node.src)) {
          processedScripts.add(node.src);
          console.log("[Loader] Intercepting:", node.src);
          node.type = "javascript/blocked";
          window.LegacyTranspiler.loadCode(node.src).catch(function(err) {
            console.error("[Loader] Failed:", node.src, err);
          });
        }
        
        if (node.tagName === "SCRIPT" && !node.src && node.textContent && node.type !== "javascript/blocked") {
          var content = node.textContent;
          var needsTranspile = /(\?\?=?|&&=?|\|\|=?|class\s+\w+\s*\{|\#\w+|\basync\b|import\s*\(|export\s+)/g.test(content);
          
          if (needsTranspile) {
            console.log("[Loader] Transpiling inline script");
            node.type = "javascript/blocked";
            try {
              var transpiled = window.LegacyTranspiler.transpile("inline.js", content);
              var newScript = document.createElement("script");
              newScript.textContent = transpiled;
              node.parentNode.replaceChild(newScript, node);
            } catch(e) {
              console.error("[Loader] Inline failed:", e);
            }
          }
        }
      }
    }
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  setTimeout(function() {
    var scripts = document.querySelectorAll("script:not([data-processed])");
    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i];
      if (script.src && !processedScripts.has(script.src)) {
        script.setAttribute("data-processed", "true");
        processedScripts.add(script.src);
        script.type = "javascript/blocked";
        window.LegacyTranspiler.loadCode(script.src);
      }
    }
  }, 100);
  
  console.log("[Loader] Active for iOS " + iosVersion);
})();
