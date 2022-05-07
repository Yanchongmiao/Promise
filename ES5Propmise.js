(function () {
  "use strict";
  var PENDING = "pending";
  var FULFILLED = "fulfilled";
  var REJECTED = "rejected";
  function Promise(executor) {
    var self = this;
    if (typeof executor !== "function")
      throw new TypeError("Promise resolver undefined is not a function");
    if (!(self instanceof Promise))
      throw new TypeError("undefined is not a promise");
    // 设置私有属性 状态 结果 异步成功 异步失败
    define(this, "PromiseState", PENDING);
    define(this, "PromiseResult", undefined);
    define(this, "onResolveCallbacks", []);
    define(this, "onRejectCallbacks", []);
    var change = function change(state, value) {
      if (self.PromiseState === PENDING) {
        self.PromiseState = state;
        self.PromiseResult = value;
        var callback =
          self.PromiseState === FULFILLED
            ? self.onResolveCallbacks
            : self.onRejectCallbacks;
        if (callback.length > 0) {
          // 异步通知执行
          setTimeout(() => {
            callback.forEach(function (callBack) {
              callBack();
            });
          });
        }
      }
    };
    try {
      executor(
        function resolve(value) {
          change(FULFILLED, value);
        },
        function (reason) {
          change(REJECTED, reason);
        }
      );
    } catch (err) {
      change(REJECTED, err);
    }
  }
  var checkInstance = function checkInstance(self) {
    if (!(self instanceof Promise))
      throw new TypeError(
        "Method then called on incompatible receiver #<Promise>"
      );
  };
  var resolvePromise = function resolvePromise(promise, x, resolve, reject) {
    if (x === promise)
      throw new TypeError("Chaining cycle detected for promise #<Promise>");
    if (x !== null && /^(object|function)$/.test(typeof x)) {
      var then;
      try {
        then = x.then;
      } catch (error) {
        reject(error);
        return;
      }
      if (typeof then === "function") {
        // x是一个promise实例了
        var called = false;
        try {
          then.call(
            x,
            function onFulfilled(y) {
              if (called) return;
              called = true;
              resolvePromise(promise, y, resolve, reject);
            },
            function onRejected(r) {
              if (called) return;
              called = true;
              reject(r);
            }
          );
        } catch (error) {
          if (called) return;
          called = true;
          reject(error);
        }
        return;
      }
    }
    resolve(x);
  };
  var proto = Promise.prototype;
  // 原型或者私有属性上加方法
  var define = function define(obj, key, value) {
    Object.defineProperty(obj, key, {
      enumerable: false,
      configurable: true,
      writable: true,
      value: value,
    });
  };
  define(proto, "then", function then(onFulfilled, onRejected) {
    // 判断.then是否通过实例访问的
    var self = this,
      promise;
    checkInstance(self);
    // 实现穿透机制
    if (typeof onFulfilled !== "function") {
      onFulfilled = function onFulfilled(value) {
        return value;
      };
    }
    if (typeof onRejected !== "function") {
      onRejected = function onRejected(reason) {
        throw reason;
      };
    }
    // 实现then链机制
    promise = new Promise((resolve, reject) => {
      if (self.PromiseState === FULFILLED) {
        setTimeout(function () {
          try {
            var x = onFulfilled(self.PromiseResult);
            resolvePromise(promise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      } else if (self.PromiseState === REJECTED) {
        setTimeout(function () {
          try {
            var x = onRejected(self.PromiseResult);
            resolvePromise(promise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      } else {
        // 异步了
        self.onResolveCallbacks.push(function () {
          try {
            var x = onFulfilled(self.PromiseResult);
            resolvePromise(promise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
        self.onRejectCallbacks.push(function () {
          try {
            var x = onRejected(self.PromiseResult);
            resolvePromise(promise, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        });
      }
    });
    return promise;
  });
  define(proto, "catch", function Catch(callback) {
    var self = this;
    checkInstance(self);
    return self.then(null, callback);
  });
  define(proto, "finally", function Finally(callback) {
    var self = this;
    checkInstance(self);
    return self.then(null, callback);
  });
  define(Promise, "resolve", function Finally(callback) {
    return new Promise(async function (resolve) {
      var v = await callback;
      resolve(v);
    });
  });
  define(Promise, "reject", function Finally(callback) {
    return new Promise(async function (resolve, reject) {
      try {
        var v = await callback;
        reject(v);
      } catch (error) {
        reject(error);
      }
    });
  });
  /* 测试规范 */
  Promise.deferred = function () {
    var result = {};
    result.promise = new Promise(function (resolve, reject) {
      result.resolve = resolve;
      result.reject = reject;
    });
    return result;
  };
  if (typeof window !== "undefined") window.Promise = Promise;
  if (typeof module === "object" && typeof module.exports === "object")
    module.exports = Promise;
})();