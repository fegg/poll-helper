import { PollAsyncService } from '../PollAsyncService';
import { PollServiceError } from '../PollServiceError';

describe('PollAsyncService', () => {
  test('success 执行正常且执行次数符合预期', async () => {
    const poll = new PollAsyncService();
    const mockPolling = jest.spyOn(poll, 'execute');

    function service() {
      return Promise.resolve('test');
    }

    await poll
      .setPromise(service)
      .setMaxCount(3)
      .success(res => {
        expect(res).toBe('test');
      })
      .start();

    expect(mockPolling).toBeCalledTimes(3);
  });

  test('fail 执行正常且重试次数符合预期', async () => {
    const poll = new PollAsyncService();

    function service() {
      return Promise.reject(new Error('test'));
    }

    await poll
      .setPromise(service)
      .setRetryMaxCount(3)
      .fail(err => {
        expect(err.message).toBe('test');
      })
      .start();

    expect(poll._currentRetryCount).toBe(3);
    expect(poll._currentRunningCount).toBe(5);
  });

  test('logger 行为符合预期', async () => {
    const poll = new PollAsyncService({
      logger: (e: PollServiceError) => {
        expect(e.message).toBe('test');
      },
    });

    function service() {
      return Promise.reject(new Error('test'));
    }

    await poll.setPromise(service).setMaxCount(3).start();

    function serviceLogger() {
      return Promise.reject(new Error('test setLogger'));
    }
    function customLogger(e: PollServiceError) {
      expect(e.message).toBe('test setLogger');
    }

    await poll.setLogger(customLogger).setPromise(serviceLogger).start();
  });

  test('stop 行为符合预期', async () => {
    const poll = new PollAsyncService();
    const mockPolling = jest.spyOn(poll, 'execute');
    let runningCount = 1;

    function service() {
      return Promise.resolve('test');
    }

    await poll
      .setPromise(service)
      .setMaxCount(5)
      .success(res => {
        expect(res).toBe('test');
      })
      .complete(() => {
        runningCount++;

        if (runningCount === 3) {
          poll.stop();
        }
      })
      .start();

    expect(mockPolling).toBeCalledTimes(3);
  });

  test('restart 行为符合预期', async () => {
    const poll = new PollAsyncService();
    const mockPolling = jest.spyOn(poll, 'execute');
    let runningCount = 1;

    function service() {
      return Promise.resolve('test');
    }

    await poll
      .setPromise(service)
      .setMaxCount(10)
      .success(res => {
        expect(res).toBe('test');
      })
      .complete(() => {
        runningCount++;

        if (runningCount === 3) {
          poll.pause();
        }
      });

    await poll.restart();
    expect(mockPolling).toBeCalledTimes(3);

    runningCount = 1;

    await poll.restart();
    expect(mockPolling).toBeCalledTimes(6);
  });

  test('暂停操作', async () => {
    const poll = new PollAsyncService();

    function service() {
      return Promise.resolve('test');
    }

    await poll
      .setPromise(service)
      .setRetryMaxCount(3)
      .fail(err => {
        expect(err.message).toBe('test');
      })
      .start();

    expect(poll.isPaused()).toBe(false);

    await poll.pause();
    expect(poll.isPaused()).toBe(true);
  });
});
