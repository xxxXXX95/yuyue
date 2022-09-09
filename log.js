const winston = require('winston');
const { format } = winston;
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
	return `${timestamp}-${level}: ${message}`;
});

const logger = winston.createLogger({
	level: 'info',
	format: combine(
		label('yuye'),
		timestamp({
			format: 'HH:mm:ss'
		}),
		myFormat
	),
	defaultMeta: { service: 'yuye' },
	transports: [
		new winston.transports.File({
			filename: './log/error.log',
			level: 'error'
		}),
		new winston.transports.File({ filename: './log/combined.log' }),
		new winston.transports.Console()
	]
});

Object.assign(console, {
	log(...arg) {
		logger.info(arg.join(''));
	},
	error(...arg) {
		logger.error(arg.join(''));
	},
	info(...arg) {
		logger.info(arg.join(''));
	}
});


module.exports = logger;

