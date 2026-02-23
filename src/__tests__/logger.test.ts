import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { logger } from '../logger';

describe('logger', () => {
  let logSpy: ReturnType<typeof spyOn>;
  let warnSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logger._resetLevel();
  });

  test('デフォルトレベルは info', () => {
    logger._resetLevel();
    logger.debug('hidden');
    logger.info('shown');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('shown');
  });

  test('debug レベルでは全て出力される', () => {
    logger._setLevel('debug');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    expect(logSpy).toHaveBeenCalledTimes(2); // debug, info
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test('warn レベルでは debug/info は出力されない', () => {
    logger._setLevel('warn');
    logger.debug('hidden');
    logger.info('hidden');
    logger.warn('shown');
    logger.error('shown');
    expect(logSpy).toHaveBeenCalledTimes(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test('silent レベルでは何も出力されない', () => {
    logger._setLevel('silent');
    logger.debug('hidden');
    logger.info('hidden');
    logger.warn('hidden');
    logger.error('hidden');
    expect(logSpy).toHaveBeenCalledTimes(0);
    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });

  test('always はレベルに関係なく出力される', () => {
    logger._setLevel('silent');
    logger.always('always shown');
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('always shown');
  });

  test('_resetLevel で環境変数から再読み込みされる', () => {
    logger._setLevel('error');
    logger.info('hidden');
    expect(logSpy).toHaveBeenCalledTimes(0);

    logger._resetLevel();
    // デフォルト(info)に戻る
    logger.info('shown');
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  test('複数引数が渡される', () => {
    logger._setLevel('info');
    logger.info('a', 'b', 3);
    expect(logSpy).toHaveBeenCalledWith('a', 'b', 3);
  });
});
