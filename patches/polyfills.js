// FILE: patches/polyfills.js
// ============================================
// ES2020-2025 Polyfills for iOS 15.8
// ============================================

// MediaQueryList.addEventListener (iOS 15 uses deprecated addListener)
(function(w){
  function getProto() {
    if (w.MediaQueryList) return w.MediaQueryList.prototype;
    if (typeof w.matchMedia === "function") {
      var mql = w.matchMedia("all");
      return Object.getPrototypeOf(mql);
    }
  }
  var proto = getProto();
  if (!proto) return;
  var wrappers = new WeakMap();
  proto.addEventListener = proto.addEventListener || function(type, listener) {
    if (type !== "change") return;
    if (typeof listener === "function") {
      proto.addListener.call(this, listener);
    } else {
      var wrapper = wrappers.get(listener);
      if (!wrapper) {
        wrapper = function(ev) { listener.handleEvent(ev); };
        wrappers.set(listener, wrapper);
      }
      proto.addListener.call(this, wrapper);
    }
  };
  proto.removeEventListener = proto.removeEventListener || function(type, listener) {
    if (type !== "change") return;
    if (typeof listener === "function") {
      proto.removeListener.call(this, listener);
    } else {
      var wrapper = wrappers.get(listener);
      if (!wrapper) return;
      proto.removeListener.call(this, wrapper);
    }
  };
})(window);

// queueMicrotask
if (!window.queueMicrotask) {
  window.queueMicrotask = function(callback) {
    Promise.resolve().then(callback);
  };
}

// Promise.withResolvers (ES2024)
if (!Promise.withResolvers) {
  Promise.withResolvers = function() {
    var resolve, reject;
    var promise = new Promise(function(res, rej) {
      resolve = res;
      reject = rej;
    });
    return { promise: promise, resolve: resolve, reject: reject };
  };
}

// Array.prototype.at (ES2022)
if (!Array.prototype.at) {
  Array.prototype.at = function(index) {
    var length = this.length;
    var relativeIndex = index >= 0 ? index : length + index;
    if (relativeIndex < 0 || relativeIndex >= length) return undefined;
    return this[relativeIndex];
  };
}

// String.prototype.at
if (!String.prototype.at) {
  String.prototype.at = function(index) {
    var length = this.length;
    var relativeIndex = index >= 0 ? index : length + index;
    if (relativeIndex < 0 || relativeIndex >= length) return undefined;
    return this[relativeIndex];
  };
}

// Object.hasOwn (ES2022)
if (!Object.hasOwn) {
  Object.hasOwn = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// Promise.any (ES2021)
if (!Promise.any) {
  Promise.any = function(promises) {
    return new Promise(function(resolve, reject) {
      var errors = [];
      var pending = promises.length;
      if (pending === 0) {
        reject(new AggregateError([], "All promises were rejected"));
        return;
      }
      for (var i = 0; i < promises.length; i++) {
        Promise.resolve(promises[i]).then(resolve, function(err) {
          errors[i] = err;
          pending--;
          if (pending === 0) {
            reject(new AggregateError(errors, "All promises were rejected"));
          }
        });
      }
    });
  };
}

// String.prototype.replaceAll (ES2021)
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(search, replacement) {
    if (typeof search === "string") {
      return this.split(search).join(replacement);
    }
    if (search instanceof RegExp) {
      if (!search.global) {
        throw new TypeError("replaceAll must be called with a global RegExp");
      }
      return this.replace(search, replacement);
    }
    return this.replace(search, replacement);
  };
}

// AggregateError
if (typeof AggregateError === "undefined") {
  window.AggregateError = function AggregateError(errors, message) {
    var e = new Error(message);
    e.errors = errors;
    e.name = "AggregateError";
    return e;
  };
}

// structuredClone (ES2021 partial)
if (!window.structuredClone) {
  window.structuredClone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}
