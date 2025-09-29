const originalStdoutHandle = (process.stdout as any)._handle;
const originalStderrHandle = (process.stderr as any)._handle;

afterEach(() => {
  jest.resetModules();
  jest.dontMock('os');
  jest.dontMock('@modelcontextprotocol/sdk/server/stdio.js');
  (process.stdout as any)._handle = originalStdoutHandle;
  (process.stderr as any)._handle = originalStderrHandle;
});

describe('EnhancedStdioServerTransport', () => {
  it('applique une configuration spécifique à Windows', async () => {
    const stdoutHandle = (process.stdout as any)._handle;
    const stderrHandle = (process.stderr as any)._handle;
    const setBlockingStdout = stdoutHandle
      ? jest.spyOn(stdoutHandle, 'setBlocking')
      : jest.fn();
    const setBlockingStderr = stderrHandle
      ? jest.spyOn(stderrHandle, 'setBlocking')
      : jest.fn();

    const setEncoding = jest.spyOn(process.stdin, 'setEncoding').mockImplementation(() => process.stdin);
    const setDefaultEncoding = jest
      .spyOn(process.stdout, 'setDefaultEncoding')
      .mockImplementation(() => process.stdout);

    jest.resetModules();
    jest.doMock('os', () => ({ platform: jest.fn(() => 'win32') }));
    const transportSpy = jest.fn();
    jest.doMock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: class {
        constructor() {
          transportSpy();
        }
      }
    }));

    const { EnhancedStdioServerTransport } = require('../utils/platform-stdio');
    new EnhancedStdioServerTransport();

    expect(transportSpy).toHaveBeenCalled();
    expect(setEncoding).toHaveBeenCalledWith('utf8');
    expect(setDefaultEncoding).toHaveBeenCalledWith('utf8');
    expect(setBlockingStdout).toHaveBeenCalled();
    expect(setBlockingStderr).toHaveBeenCalled();

    setEncoding.mockRestore();
    setDefaultEncoding.mockRestore();
    if ('mockRestore' in setBlockingStdout) {
      (setBlockingStdout as jest.SpyInstance).mockRestore();
    }
    if ('mockRestore' in setBlockingStderr) {
      (setBlockingStderr as jest.SpyInstance).mockRestore();
    }
  });

  it('ne force pas la configuration Windows sur Linux', async () => {
    const stdoutHandle = (process.stdout as any)._handle;
    const setBlockingStdout = stdoutHandle
      ? jest.spyOn(stdoutHandle, 'setBlocking')
      : jest.fn();

    jest.resetModules();
    jest.doMock('os', () => ({ platform: jest.fn(() => 'linux') }));
    const { EnhancedStdioServerTransport } = require('../utils/platform-stdio');
    new EnhancedStdioServerTransport();

    expect(setBlockingStdout).not.toHaveBeenCalled();

    if ('mockRestore' in setBlockingStdout) {
      (setBlockingStdout as jest.SpyInstance).mockRestore();
    }
  });
});
