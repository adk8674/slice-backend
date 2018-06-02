const Task = require('../utils/scheduler/Task');
const WebsocketHandler = require('../utils/websocket/Handler');

class KillDeadWebsockets extends Task {

	constructor() {
		super(30, 's');
	}

	run() {
		const websocketHandler = WebsocketHandler.getInstance();

		for (const client of websocketHandler.ws.clients)
			if (Date.now() - client.lastHeartbeatAt > 35000)
				client.close(4009);
	}

}

module.exports = new KillDeadWebsockets();
