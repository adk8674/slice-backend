const redis = require('redis');

let instance;

/**
 * A wrapper around the Redis cache with utility functions
 */
class CacheConnector {

	/**
	 * Creates a new connector. Connectors are automatically instantiated; use `CacheConnector.getInstance` instead
	 * @param {Object} options The connection info and configuration to pass to the redis module 
	 */
	constructor(options) {
		this.client = redis.createClient(options);
		instance = this;
	}

	/**
	 * Returns the last instantiated connector
	 * @returns {CacheConnector?} The last instantiated connector
	 */
	static getInstance() {
		return instance;
	}

	/**
	 * Queries the Redis Cache
	 * @param {String} key The key to query
	 * @returns {Promise<Object?>} The saved cache value
	 */
	get(key) {
		return new Promise((resolve, reject) => {

			this.client.get(key, (err, result) => {
				if (err) return reject(err);

				if (!result) return resolve(result);

				try {
					result = JSON.parse(result);
				} catch (err) {
					return reject(new Error('Failed to parse JSON data'));
				}

				resolve(result);
			});

		});
	}

	/**
	 * Changes a value in the Redis Cache
	 * @param {String} key The key to save the value to
	 * @param {Object} value The value to set
	 * @returns {Promise}
	 */
	set(key, value) {
		return new Promise((resolve, reject) => {

			if (typeof value === 'object') {
				try {
					value = JSON.stringify(value);
				} catch (err) {
					return reject(new Error('Failed to stringify JSON data'));
				}
			}

			this.client.set(key, value, (err) => {
				if (err) return reject(err);
				resolve();
			});

		});
	}

	async prepare() {
		return new Promise((resolve, reject) => {
			console.log('[PREPARE] Flusing cache...'); // eslint-disable-line no-console

			this.client.flushall((err) => {
				if (err) return reject(err);
				console.log('[PREPARE] Cache flushed!'); // eslint-disable-line no-console
				resolve();
			});
		});
	}

}

module.exports = CacheConnector;
