const fs = require('fs');
const path = require('path');

let instance;

/**
 * A wrapper around the applications configuration files
 */
class ConfigManager {

	/**
	 * Reads all configuration files and saves them internally. Managers are automatically instantiated; use `ConfigManager.getInstance` instead
	 * @param {String} configDir The directory to read configs from 
	 */
	constructor(configDir = './configs') {
		for (const fileName of fs.readdirSync(configDir)) {
			const configName = fileName.split('.')[0];
			const contents = require(path.resolve(path.join(configDir, fileName)));

			this[configName] = contents;
		}

		instance = this;
	}

	/**
	 * Gets the last instantiated instance
	 * @returns {ConfigManager?} The last instantiated manager
	 */
	static getInstance() {
		return instance;
	}

}

module.exports = ConfigManager;
