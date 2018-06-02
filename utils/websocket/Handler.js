const WebSocket = require('ws');

let instance;

/**
 * A wrapper around the WebSocket server with utility functions
 */
class WSHandler {

	/**
	 * Creates a new WebSocket handler. Handlers are automatically instantiated; use `WSHandler.getInstance` instead
	 * @param {Object} config The config to pass to the WebSocket server
	 */
	constructor(config) {
		this.ws = new WebSocket.Server(config);
		this.database = require('../database/Connector').getInstance();
		this.cache = require('../cache/Connector').getInstance();

		this.ws.on('connection', this.handleConnect.bind(this));

		this.userMessageCounts = {};

		instance = this;
	}

	/**
	 * Returns the last instantiated handler
	 * @returns {WSHandler?} The last instantiated handler
	 */
	static getInstance() {
		return instance;
	}

	handleConnect(wsConnection) {

		wsConnection.on('message', async(message) => {
			try {
				message = JSON.parse(message);
			} catch (err) {
				return wsConnection.close(4002);
			}

			if (message.operation === 'IDENTIFY') return this.identify(wsConnection, message);

			if (!wsConnection.userID) return wsConnection.close(4003);

			if (this.userMessageCounts[wsConnection.userID] > 120) {
				wsConnection.close(4008);

				let violations = (await this.cache.get(`violations:${wsConnection.userID}`)) || [];
				violations = violations.filter(violation => violation.timestamp < Date.now() - 7 * 24 * 60 * 60 * 1000);
				violations.push({
					type: 'WS_TOO_MANY_MESSAGES',
					timestamp: Date.now()
				});

				return this.cache.set(`violations:${wsConnection.userID}`, violations);
			}

			this.userMessageCounts[wsConnection.userID] = (this.userMessageCounts[wsConnection.userID] || 0) + 1;

			if (message.operation === 'HEARTBEAT') return this.heartbeat(wsConnection, message);

			wsConnection.close(4001);
		});

		wsConnection.on('error', () => wsConnection.close(4000));

		wsConnection.lastHeartbeatAt = Date.now();
		wsConnection.messageCount = 0;
	}

	async identify(wsConnection, message) {
		if (wsConnection.userID) return wsConnection.close(4005);

		const token = message.data;
		//FIXME adjust query
		const dbResult = await this.database.query('--UNADJUSTED QUERY', [token]);

		if (!dbResult.rowCount) return wsConnection.close(4004);

		const user = dbResult.rows[0];
		wsConnection.userID = user.id;
		wsConnection.access_token = token;
		return this.send(wsConnection, {
			operation: 'HELLO',
			data: {
				user,
				heartbeatInterval: 30000
			}
		});
	}

	heartbeat(wsConnection) {
		wsConnection.lastHeartbeatAt = Date.now();
		return this.send(wsConnection, {
			operation: 'HEARTBEAT_ACK'
		});
	}

	async send(connection, data) {
		try {
			data = JSON.stringify(data);
		} catch (err) {
			return connection.close(4000);
		}

		try {
			if (connection.readyState !== WebSocket.OPEN) await new Promise(resolve => {
				setInterval(() => {
					if (connection.readyState === WebSocket.OPEN) resolve();
				}, 50);
			});
		} catch (err) {
			return connection.close(4009);
		}

		return connection.send(data);
	}

	broadcastToUsers(ids, message) {
		for (const client of this.ws.clients) {
			if (!ids.includes(client.userID)) continue;

			this.send(client, message);
		}
	}

}

module.exports = WSHandler;
