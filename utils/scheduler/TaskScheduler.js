const fs = require('fs');
const path = require('path');

class TaskScheduler {

	constructor(tasksDir = './tasks') {

		for (const fileName of fs.readdirSync(tasksDir)) {
			const task = require(path.resolve(path.join(tasksDir, fileName)));

			const runOffset = task.interval - (Date.now() % task.interval);

			console.log(`[SCHEDULER] Task ${fileName.split('.')[0]} will run in ${Math.floor(runOffset / 1000)}s`); // eslint-disable-line no-console

			setTimeout(() => {
				task.run.call(task);
				setInterval(task.run.bind(task), task.interval);
			}, runOffset);
		}

	}

}

module.exports = TaskScheduler;
