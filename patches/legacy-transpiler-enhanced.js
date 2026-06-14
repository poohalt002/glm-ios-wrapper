// Enhanced Legacy Transpiler – fills gaps for iOS 15
(function(global) {
    'use strict';

    // ========== ES2020 ==========
    // globalThis
    if (typeof global.globalThis === 'undefined') global.globalThis = global;

    // Promise.allSettled
    if (typeof Promise.allSettled !== 'function') {
        Promise.allSettled = function(promises) {
            return Promise.all(promises.map(function(p) {
                return Promise.resolve(p).then(
                    function(value) { return { status: 'fulfilled', value: value }; },
                    function(reason) { return { status: 'rejected', reason: reason }; }
                );
            }));
        };
    }

    // String.prototype.matchAll (with full regexp support)
    if (typeof String.prototype.matchAll !== 'function') {
        String.prototype.matchAll = function(regexp) {
            var flags = regexp.flags;
            if (!flags.includes('g')) flags += 'g';
            var rx = new RegExp(regexp.source, flags);
            var matches = [];
            var match;
            while ((match = rx.exec(this)) !== null) {
                matches.push(match);
            }
            return matches[Symbol.iterator]();
        };
    }

    // BigInt (no-op for non-BigInt environments)
    if (typeof BigInt === 'undefined') global.BigInt = function(v) { return Number(v); };

    // ========== ES2021 ==========
    // String.prototype.replaceAll (already in polyfills, but ensure)
    if (typeof String.prototype.replaceAll !== 'function') {
        String.prototype.replaceAll = function(search, replacement) {
            if (typeof search === 'string') return this.split(search).join(replacement);
            if (search instanceof RegExp) {
                if (!search.global) throw new TypeError('replaceAll must be called with a global RegExp');
                return this.replace(search, replacement);
            }
            return this.replace(search, replacement);
        };
    }

    // Promise.any
    if (typeof Promise.any !== 'function') {
        Promise.any = function(promises) {
            return new Promise(function(resolve, reject) {
                var errors = [];
                var pending = promises.length;
                if (pending === 0) {
                    reject(new AggregateError([], 'All promises were rejected'));
                    return;
                }
                for (var i = 0; i < promises.length; i++) {
                    Promise.resolve(promises[i]).then(resolve, function(err) {
                        errors[i] = err;
                        if (--pending === 0) reject(new AggregateError(errors, 'All promises were rejected'));
                    });
                }
            });
        };
    }

    // AggregateError
    if (typeof AggregateError === 'undefined') {
        global.AggregateError = function AggregateError(errors, message) {
            var e = new Error(message);
            e.errors = errors;
            e.name = 'AggregateError';
            return e;
        };
    }

    // WeakRef and FinalizationRegistry (no‑op stubs that don't crash)
    if (typeof WeakRef === 'undefined') {
        global.WeakRef = function(value) { return { deref: function() { return value; } }; };
    }
    if (typeof FinalizationRegistry === 'undefined') {
        global.FinalizationRegistry = function() {
            return { register: function() {}, unregister: function() {} };
        };
    }

    // ========== ES2022 ==========
    // Array.prototype.at, String.prototype.at (already in polyfills)
    // Object.hasOwn
    if (typeof Object.hasOwn !== 'function') {
        Object.hasOwn = function(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        };
    }

    // Array.prototype.findLast, findLastIndex
    if (typeof Array.prototype.findLast !== 'function') {
        Array.prototype.findLast = function(predicate, thisArg) {
            for (var i = this.length - 1; i >= 0; i--) {
                if (predicate.call(thisArg, this[i], i, this)) return this[i];
            }
            return undefined;
        };
    }
    if (typeof Array.prototype.findLastIndex !== 'function') {
        Array.prototype.findLastIndex = function(predicate, thisArg) {
            for (var i = this.length - 1; i >= 0; i--) {
                if (predicate.call(thisArg, this[i], i, this)) return i;
            }
            return -1;
        };
    }

    // Error cause (no‑op)
    // ========== ES2023 ==========
    // Array.prototype.toSorted, toReversed, toSpliced, with (basic fallbacks)
    if (typeof Array.prototype.toReversed !== 'function') {
        Array.prototype.toReversed = function() {
            return this.slice().reverse();
        };
    }
    if (typeof Array.prototype.toSorted !== 'function') {
        Array.prototype.toSorted = function(compareFn) {
            return this.slice().sort(compareFn);
        };
    }
    if (typeof Array.prototype.toSpliced !== 'function') {
        Array.prototype.toSpliced = function(start, deleteCount) {
            var args = Array.prototype.slice.call(arguments);
            var copy = this.slice();
            copy.splice.apply(copy, args);
            return copy;
        };
    }
    if (typeof Array.prototype.with !== 'function') {
        Array.prototype.with = function(index, value) {
            var copy = this.slice();
            copy[index] = value;
            return copy;
        };
    }

    // ========== ES2024 ==========
    // Promise.withResolvers
    if (typeof Promise.withResolvers !== 'function') {
        Promise.withResolvers = function() {
            var resolve, reject;
            var promise = new Promise(function(res, rej) {
                resolve = res;
                reject = rej;
            });
            return { promise: promise, resolve: resolve, reject: reject };
        };
    }

    // Atomics.waitAsync (no‑op)
    if (global.Atomics && typeof Atomics.waitAsync !== 'function') {
        Atomics.waitAsync = function() {
            return Promise.reject(new Error('Atomics.waitAsync not supported'));
        };
    }

    // ========== Web API polyfills for iOS 15 ==========
    // structuredClone (basic)
    if (typeof global.structuredClone !== 'function') {
        global.structuredClone = function(obj) {
            return JSON.parse(JSON.stringify(obj));
        };
    }

    // fetch with proper header handling (fix for some sites that check traceparent)
    var originalFetch = global.fetch;
    if (originalFetch) {
        global.fetch = function(url, options) {
            if (options && options.headers) {
                var headers = new Headers(options.headers);
                headers.delete('traceparent');
                headers.delete('tracestate');
                options.headers = headers;
            }
            return originalFetch(url, options);
        };
    }

    // MediaQueryList addEventListener (iOS 15 uses addListener)
    if (global.MediaQueryList && !global.MediaQueryList.prototype.addEventListener) {
        var proto = global.MediaQueryList.prototype;
        var wrappers = new WeakMap();
        proto.addEventListener = function(type, listener) {
            if (type !== 'change') return;
            if (typeof listener === 'function') {
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
        proto.removeEventListener = function(type, listener) {
            if (type !== 'change') return;
            if (typeof listener === 'function') {
                proto.removeListener.call(this, listener);
            } else {
                var wrapper = wrappers.get(listener);
                if (wrapper) proto.removeListener.call(this, wrapper);
            }
        };
    }

    // queueMicrotask (fallback)
    if (typeof global.queueMicrotask !== 'function') {
        global.queueMicrotask = function(cb) {
            Promise.resolve().then(cb);
        };
    }

    // ========== CSS features ==========
    // CSS.supports (already there, but ensure)
    if (!global.CSS) global.CSS = {};
    if (typeof global.CSS.supports !== 'function') {
        global.CSS.supports = function(prop, value) {
            var el = document.createElement('div');
            if (arguments.length === 1) {
                var pair = prop.split(':');
                return typeof el.style[pair[0].trim()] !== 'undefined';
            }
            return typeof el.style[prop] !== 'undefined';
        };
    }

    console.log('[Enhanced Transpiler] Loaded – fills ES2020-2025 gaps for iOS 15');
})(window);
