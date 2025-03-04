import chalk from 'chalk';

export enum LogLevel {
	TRACE,
	DEBUG,
	INFO,
	WARN,
	ERROR,
	FATAL,
	OFF,
}

export default class Logger {
	public static formatMessage(level: LogLevel, message: string): string {
		const timestamp = new Date().toISOString();
		const levelStr = LogLevel[level];

		let levelColor = chalk.bold;

		switch (level) {
			case LogLevel.TRACE:
				levelColor = levelColor.cyan;
				break;
			case LogLevel.DEBUG:
				levelColor = levelColor.grey;
				break;
			case LogLevel.INFO:
				levelColor = levelColor.blue;
				break;
			case LogLevel.WARN:
				levelColor = levelColor.yellow;
				break;
			case LogLevel.ERROR:
				levelColor = levelColor.red;
				break;
			case LogLevel.FATAL:
				levelColor = levelColor.redBright;
				break;
			case LogLevel.OFF:
		}

		return `${chalk.gray.bold(`[${timestamp}]`)} ${levelColor(
			`[${levelStr}]`
		)} ${message}`;
	}

	public static writeMessage(formattedMessage: string) {
		console.log(formattedMessage);
	}

	public static log(level: LogLevel, message: string) {
		Logger.writeMessage(Logger.formatMessage(level, message));
	}

	public static trace(message: string) {
		this.log(LogLevel.TRACE, message);
	}

	public static debug(message: string) {
		this.log(LogLevel.DEBUG, message);
	}

	public static info(message: string) {
		this.log(LogLevel.INFO, message);
	}

	public static warn(message: string) {
		this.log(LogLevel.WARN, message);
	}

	public static error(message: string) {
		this.log(LogLevel.ERROR, message);
	}

	public static fatal(message: string) {
		this.log(LogLevel.FATAL, message);
	}
}
