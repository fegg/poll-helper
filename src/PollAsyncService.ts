import _ from 'lodash';
import { IReturnCallback } from './typings/IReturnCallback';
import { IPollServiceProps } from './typings/IPollServiceProps';
import { PollServiceError } from './PollServiceError';
import { IPromiseService } from './typings/IPromiseService';

function func(props: PollServiceError) {
  console.log('[PollAsyncService] -> ', props);
}

export class PollAsyncService<T = any> {
  maxCount: number;
  delay: number;

  _timer: any;
  _currentRunningCount: number;
  _currentRetryCount: number;
  _retryMaxCount: number;
  _aborted: boolean;
  // 是否连接中
  _paused: boolean;

  logger: (e: PollServiceError) => void;
  promise?: IPromiseService<any, T>;

  _success?: IReturnCallback<T>;
  _fail?: IReturnCallback<T>;
  _complete?: IReturnCallback<T>;

  constructor(options?: any) {
    this._aborted = false;
    this._paused = false;
    this._timer = null;
    this._currentRetryCount = 0;
    this._currentRunningCount = 1;
    this._retryMaxCount = 0;

    this.maxCount = options?.maxCount ?? 0;
    this.delay = options?.delay ?? -1;
    this.logger = _.isFunction(options?.logger) ? options.logger : func;
  }

  isPaused () {
    return this._paused;
  }

  setPromise(promise: IPromiseService<any, T>) {
    this.promise = promise;
    return this;
  }

  setLogger(logger: (e: PollServiceError) => void) {
    if (!_.isFunction(logger)) {
      // logger 是一个 extra，不阻塞主流程运行
      console.error('logger 必须是一个 Function!');
      return this;
    }

    this.logger = logger;
    return this;
  }

  setMaxCount(maxCount: number) {
    this.maxCount = maxCount;
    return this;
  }

  setRetryMaxCount(count: number) {
    this._retryMaxCount = count;
    return this;
  }

  success(success: IReturnCallback<T>) {
    this._success = success;
    return this;
  }

  fail(fail: IReturnCallback<T>) {
    this._fail = fail;
    return this;
  }

  complete(complete: IReturnCallback<T>) {
    this._complete = complete;
    return this;
  }

  isLimitMaxCount(): boolean {
    return this.maxCount > 0;
  }

  start(): Promise<any> {
    if (!this.promise) {
      return Promise.resolve();
    }

    return this.execute();
  }

  execute(): Promise<any> {
    const limitCount = this.isLimitMaxCount() && this.maxCount <= this._currentRunningCount;

    // 非逻辑特殊限制提前返回
    if (!this.promise) {
      return Promise.resolve();
    }

    // 逻辑限制返回
    if (this._aborted || this._paused || limitCount) {
      return Promise.resolve();
    }

    this._currentRunningCount++;

    return this.promise()
      .then(result => {
        // 成功后，恢复一下重试数据
        this._currentRetryCount = 0;

        this._success?.(result);
        this._complete?.(result);

        return this.executeByDelay();
      })
      .catch(err => {
        this.logger(err);
        this._fail?.(err);
        this._complete?.(err);

        if (this._retryMaxCount <= this._currentRetryCount) {
          return Promise.resolve();
        }

        this._currentRetryCount++;

        return this.executeByDelay();
      });
  }

  executeByDelay() {
    if (this.delay > -1) {
      this._timer = setTimeout(() => {
        clearTimeout(this._timer);
        return this.execute();
      }, this.delay);
    } else {
      return this.execute();
    }
  }

  pause() {
    this._paused = true;
    this._timer = null;
    clearTimeout(this._timer);
  }

  stop() {
    clearTimeout(this._timer);

    this._aborted = true;
    this._paused = false;
    this._timer = null;
    this._currentRunningCount = 1;
    this._currentRetryCount = 0;
  }

  restart() {
    if (this._paused) {
      this._paused = false;
      return this.start();
    } else {
      return this.start();
    }
  }
}
