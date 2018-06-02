const ConfigManager = require('./utils/config/ConfigManager');
const TasksScheduler = require('./utils/scheduler/TaskScheduler');
const DatabaseConnector = require('./utils/database/Connector');
const RedisConnector = require('./utils/cache/Connector');
const HTTPHandler = require('./utils/http/Handler');
const Mailer = require('./utils/mail/Mailer');
const WebsocketHandler = require('./utils/websocket/Handler');
const fs = require('fs');
const path = require('path');

/**
 * Represents the entire Slice API
 */
class Slice {

	/**
	 * Automatically loads all dependencies, error handlers and runs the individual sub-servers
	 */
	constructor() {
		this.configs = new ConfigManager();
		this.tasksScheduler = new TasksScheduler();
		this.database = new DatabaseConnector(this.configs.database);
		this.redis = new RedisConnector(this.configs.redis);
		this.mailer = new Mailer(this.configs.mail);
		this.ws = new WebsocketHandler(this.configs.websocket);

		this.httpHandler = new HTTPHandler(this.configs.http);

		process.on('unhandledRejection', (err) => {
			console.error(err); // eslint-disable-line no-console

			for (const email of this.configs.emails.error) {
				this.mailer.sendMail(email, 'API Error', 'error', {
					message: err.toString(),
					stack: err.stack,
					time: (new Date()).toString()
				});
			}
		});

		process.on('uncaughtException', (err) => {
			console.error(err); // eslint-disable-line no-console

			for (const email of this.configs.emails.error) {
				this.mailer.sendMail(email, 'API Error', 'error', {
					message: err.toString(),
					stack: err.stack,
					time: (new Date()).toString()
				});
			}
		});

		this.run();
	}

	/**
	 * Checks for CLI arguments and handles them
	 * @private
	 * @returns {promise}
	 */
	async run() {

		const args = process.argv.slice(2);
		if (args.includes('--prepare')) {
			await this.database.prepare();
			await this.redis.prepare();

			console.log('[PREPARE] Rebuilding hard storage..'); // eslint-disable-line no-console

			for (const relativePath of Object.values(this.configs.storage)) {
				const storagePath = path.resolve(relativePath);

				if (fs.existsSync(storagePath)) {
					const deleteRecursively = (pathToDelete) => {
						for (const subPath of fs.readdirSync(pathToDelete)) {
							const newPath = path.join(pathToDelete, subPath);
							if (fs.lstatSync(newPath).isDirectory()) return deleteRecursively(newPath);

							fs.unlinkSync(newPath);
						}
					};

					deleteRecursively(storagePath);
				}

				if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath);
			}

			console.log('[PREPARE] Hard storage rebuilt!'); // eslint-disable-line no-console

			console.log('[PREPARE] Done preparing!'); // eslint-disable-line no-console
		}

	}

}

module.exports = new Slice();
