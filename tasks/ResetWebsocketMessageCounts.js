const Task = require('../utils/scheduler/Task');
const WebsocketHandler = require('../utils/websocket/Handler');

class KillDeadWebsockets extends Task {

	constructor() {
		super(1, 'm');
	}

	run() {
		const websocketHandler = WebsocketHandler.getInstance();
		for (const userID of Object.keys(websocketHandler.userMessageCounts)) websocketHandler.userMessageCounts[userID] = 0;
	}

}

module.exports = new KillDeadWebsockets();
