const winston = require('winston');
const { format } = winston;
const util = require('util');
const { combine, timestamp, label, printf, colorize } = format;

const myFormat = printf(({ level, message, timestamp }) => {
	return util.format('%s-%s', timestamp, level, message);
});

const logger = winston.createLogger({
	level: 'info',
	format: combine(
		label('yuye'),
		timestamp({
			format: 'HH:mm:ss'
		}),
		colorize(),
		myFormat
	),
	defaultMeta: { service: 'yuye' },
	transports: [
		new winston.transports.File({
			filename: './log/error.log',
			level: 'error'
		}),
		new winston.transports.File({ filename: './log/combined.log' }),
		new winston.transports.Console({
			level: 'silly'
		})
	]
});

Object.assign(console, {
	log(...arg) {
		logger.info(util.format(...arg));
	},
	error(...arg) {
		logger.error(util.format(...arg));
	},
	info(...arg) {
		logger.info(util.format(...arg));
	}
});
module.exports = logger;

