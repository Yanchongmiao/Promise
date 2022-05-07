(function () {
  "use strict";
  // 三个状态
  var PENDING = "pending";
  var FULFILLED = "fulfilled";
  var REJECTED = "rejected";
  const resolvePromise = (promise, x, resolve, reject) => {
    if (promise === x) //防止死等待 let p1 = promise.resolve(1) let p2 = p1.then(()=>p2) 这种情况 p2 会无状态 
      throw new TypeError("Chaining cycle detected for promise #<Promise>");
      // 判断是否是promise
      if(x!==null && /^(object|function)$/.test(typeof x)){//首先x必须是对象或者函数
        let then;
        try {
          then = x.then//是否有then 有则继续进行 
        } catch (error) {
          reject(error)//无则直接reject返回
        }
        if(typeof then === 'function'){//能走到这里默认这就是个promise了
          let calls = false//记录下是否then过
          try {
            then.call(x,y=>{
              if(calls) return
              calls = true
              resolvePromise(promise,y,resolve,reject)//执行后的结果 继续递归处理 止到不为对象或者函数时
            },r=>{
              if(calls) return//处理后的promise为失败时处理
              calls = true
              reject(r)
            })
          } catch (error) {
            if(calls) return
            calls = true
            reject(r)//捕获处理时的错误 
          }
          return;
        }
      }
      resolve(x)//如果不是对象 或者是对象不是函数 就认为不是promise 直接返回结果
  };
  class Promise {
    constructor(executor) {
      if (typeof executor !== "function")
        throw new TypeError("Promise resolver undefined is not a function");
      // if(!new.target)throw new TypeError('undefined is not a promise')//使用class 这段代码可以省略 class必须要new 不能像普通函数一样执行
      this.PromiseState = PENDING;//状态
      this.PromiseResult = undefined;//结果
      this.onResolveCallbacks = [];//存储异步成功回调
      this.onRejectCallbacks = [];//存储异步失败回调
      const resolve = (value) => change(FULFILLED, value);//new promise中调用resolve回调函数
      const reject = (reason) => change(REJECTED, reason);//new promise中调用reject回调函数
      const change = (state, value) => {//成功失败异常都需要改状态 那就另外写个方法统一处理
        if (this.PromiseState === PENDING) {//只有状态是PENDING才能变为resolve or reject 
          this.PromiseState = state;
          this.PromiseResult = value;
          const callback = //获取到异步回调时resolve or reject 对象的自己的callbacks数组
            this.PromiseState === FULFILLED
              ? this.onResolveCallbacks
              : this.onRejectCallbacks;
          if (callback.length > 0) {
            callback.forEach((callback) => callback());//执行对应状态的回调数组
          }
        }
      };
      try {
        executor(resolve, reject);
      } catch (error) {
        change(REJECTED, error);//捕获异常
      }
    }
    then(onFulfilled, onRejected) {
      // 实现穿透 如果p1 不写回调函数 默认结果穿到下一次then中
      if (typeof onFulfilled !== "function") onFulfilled = (value) => value;
      if (typeof onRejected !== "function")
        onRejected = (reason) => {
          throw reason;
        };
        // 每一次的then结果始终都返回一个promise 实现then链式调用
      const promise = new Promise((resolve, reject) => {
        switch (this.PromiseState) {
          case FULFILLED:
            setTimeout(() => {
              try {
                const x = onFulfilled(this.PromiseResult);
                resolvePromise(promise, x, resolve, reject);
              } catch (error) {
                reject(error);
              }
            });
            break;
          case REJECTED:
            setTimeout(() => {
              try {
                const x = onRejected(this.PromiseResult);
                resolvePromise(promise, x, resolve, reject);
              } catch (error) {
                reject(error);
              }
            });
            break;
          default:
            this.onResolveCallbacks.push(() => {
              try {
                const x = onFulfilled(this.PromiseResult);
                resolvePromise(promise, x, resolve, reject);
              } catch (error) {
                reject(error);
              }
            });
            this.onRejectCallbacks.push(() => {
              try {
                const x = onRejected(this.PromiseResult);
                resolvePromise(promise, x, resolve, reject);
              } catch (error) {
                reject(error);
              }
            });
            break;
        }
      });
      return promise;
    }
  }
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
