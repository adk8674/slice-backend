/**
 * A task parent class, used for default methods
 */
class Task {

	/**
	 * Creates a new task
	 * @param {Number} interval The interval to run the task at
	 * @param {String} unit The unit of time (ms, s, m, h, d) 
	 */
	constructor(interval = 60, unit = 's') {
		let multiplier = 0;

		if (['ms', 'millisec', 'millisecond', 'milliseconds'].includes(unit)) multiplier = 1000;
		if (['s', 'sec', 'second', 'seconds'].includes(unit)) multiplier = 1000;
		if (['m', 'min', 'minute', 'minutes'].includes(unit)) multiplier = 1000 * 60;
		if (['h', 'hour', 'hours'].includes(unit)) multiplier = 1000 * 60 * 60;
		if (['d', 'day', 'days'].includes(unit)) multiplier = 1000 * 60 * 60 * 24;

		if (!multiplier) throw new RangeError('Invalid time unit');

		this.interval = interval * multiplier;
	}

	/**
	 * The function to run. Intended to be overwritten when inherited
	 */
	run() {}

}

module.exports = Task;
