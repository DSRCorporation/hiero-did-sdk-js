export enum LogLevel {
  test = 0,
  trace = 1,
  debug = 2,
  info = 3,
  warn = 4,
  error = 5,
  fatal = 6,
  off = 7,
}

export class ConsoleLogger {
  private readonly logLevel: LogLevel

  constructor(logLevel?: LogLevel) {
    this.logLevel = logLevel ?? LogLevel.off
  }

  public test = (message: string, data?: Record<string, any>) => this.write(LogLevel.test, message, data)
  public trace = (message: string, data?: Record<string, any>) => this.write(LogLevel.trace, message, data)
  public debug = (message: string, data?: Record<string, any>) => this.write(LogLevel.debug, message, data)
  public info = (message: string, data?: Record<string, any>) => this.write(LogLevel.info, message, data)
  public warn = (message: string, data?: Record<string, any>) => this.write(LogLevel.warn, message, data)
  public error = (message: string, data?: Record<string, any>) => this.write(LogLevel.error, message, data)
  public fatal = (message: string, data?: Record<string, any>) => this.write(LogLevel.fatal, message, data)

  private isEnabled(logLevel: LogLevel): boolean {
    return this.logLevel <= logLevel
  }

  public write(logLevel: LogLevel, message: string, data?: Record<string, any>): void {
    if (!this.isEnabled(logLevel)) return
    //console.log(message, JSON.stringify(data, null, 2))
    console.log(message, JSON.stringify(data))
  }
}
