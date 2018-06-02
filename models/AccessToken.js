const crypto = require('crypto');
const DatabaseConnector = require('../utils/database/Connector');
const WebsocketHandler = require('../utils/websocket/Handler');

/**
 * Utility class for access tokens
 */
class AccessToken {

	/**
	 * Creates an AccessToken model
	 * @param {Object} [data] The data to create the model from
	 * @param {String} [data.user_id] The user ID the token is for
	 * @param {String} [data.type] The type of the token (either `bearer` or `bot`)
	 * @param {String} [data.token] The 32-character access token
	 * @param {String?} [data.ip] The IP address the token was created from
	 * @param {Number} [data.created_at] The timestamp of creation (internall stored as a **Date** object)
	 */
	constructor(data = {}) {
		this.user_id = data.user_id;
		this.type = data.type;
		this.token = data.token;
		this.ip = data.ip;
		this.created_at = new Date(data.created_at);

		this.database = DatabaseConnector.getInstance();
	}

	/**
	 * Invalidates and deletes the access token and closes all WS connections using that token
	 * @returns {Promise<Object>} The database result
	 */
	async delete() {
		const websocketHandler = WebsocketHandler.getInstance();

		const dbResult = await this.database.query('DELETE FROM access_tokens WHERE id = $1', [this.id]);

		for (const client of websocketHandler.ws.clients)
			if (client.access_token === this.token)
				client.close(4003);

		return dbResult;
	}

	async save() {
		const result = await this.database.query('INSERT INTO access_tokens(user_id, type, token, ip, created_at) VALUES($1, $2, $3, $4, $5) RETURNING *', [this.user_id, this.type, this.token, this.ip, this.created_at]);
		return new AccessToken(result.rows[0]);
	}

	toAPIResponse() {
		return {
			user_id: this.user_id,
			type: this.type,
			token: this.token,
			ip: this.ip,
			created_at: this.created_at
		};
	}

	/**
	 * Returns a 32-character random access token using the supplied arguments
	 * @returns {String} The generated access token
	 */
	static generate() {
		return crypto.randomBytes(16).toString('hex');
	}

	static get databaseModel() {
		return ['access_tokens', {
			name: 'user_id',
			type: 'SNOWFLAKE'
		}, {
			name: 'type',
			type: 'VARCHAR(16)',
			notNull: true
		}, {
			name: 'token',
			type: 'VARCHAR(32)',
			notNull: true
		}, {
			name: 'ip',
			type: 'VARCHAR(45)',
			notNull: true
		}, {
			name: 'created_at',
			type: 'TIMESTAMP',
			notNull: true
		}];
	}

}

module.exports = AccessToken;
