const http = require('http');
const url = require('url');
const BodyParser = require('body-parser');
const User = require('../../models/User');
const tooBusy = () => false;

class HTTPHandler {

	constructor(config) {
		this.port = config.port;
		this.server = new http.Server(this.handleRequest.bind(this)).listen(this.port);
		this.router = require('../../controllers/Router');
		this.bodyParser = BodyParser.json({
			limit: '8mb'
		});
	}

	async handleRequest(req, res) {

		if (tooBusy()) {
			res.setHeader('Content-Type', 'text/plain');
			this.res.setHeader('Access-Control-Allow-Origin', this.origin || '*');
			this.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

			this.res.writeHead(503);
			return this.res.end('Server Too Busy');
		}

		req = await new Promise((resolve) => {
			this.bodyParser(req, res, () => {
				resolve(req);
			});
		});

		const request = new Request(req, res);
		request.invokedAt = Date.now();
		request.method = req.method;

		const parsedURL = url.parse(req.url, true);

		const [, controllerName] = parsedURL.pathname.split('/');
		request.controllerName = controllerName;
		request.pathname = parsedURL.pathname;

		console.log(`[HANDLER] Incoming Request: ${req.method} ${parsedURL.pathname} from ${res.socket.remoteAddress}`); // eslint-disable-line no-console

		const parameters = {
			route: {},
			query: parsedURL.query
		};

		let controller;
		for (const route of this.router.routes) {
			if (!parsedURL.pathname.match(route.pathRegex.regex)) continue;

			controller = route;
			break;
		}

		if (!controller) {
			request.status = 404;
			return request.respond('Not Found');
		}

		const pathRegex = controller.pathRegex;
		const pathVars = parsedURL.pathname.match(pathRegex.regex) || [];

		for (let i = 0; i < pathRegex.names.length; i++) {
			const key = pathRegex.names[i];
			const value = pathVars[i + 1];
			if (!value) break;

			parameters.route[key] = value;
		}

		parameters.body = req.body;
		request.params = parameters;

		let functionToCall = 'notAllowed';

		const routeParamsSuppliedCount = Object.keys(parameters.route).length;
		if (req.method === 'GET' && routeParamsSuppliedCount < controller.pathRegex.names.length) functionToCall = 'index';
		if (req.method === 'GET' && routeParamsSuppliedCount === controller.pathRegex.names.length) functionToCall = 'show';
		if (req.method === 'POST' && routeParamsSuppliedCount < controller.pathRegex.names.length) functionToCall = 'create';
		if (req.method === 'PATCH' && routeParamsSuppliedCount === controller.pathRegex.names.length) functionToCall = 'update';
		if (req.method === 'DELETE' && routeParamsSuppliedCount === controller.pathRegex.names.length) functionToCall = 'delete';
		if (req.method === 'OPTIONS') functionToCall = 'options';

		if (!controller.controller[functionToCall]) functionToCall = 'notAllowed';

		controller.controller[functionToCall].call(request);
	}

}

/**
 * A wrapper around HTTP requests with utility functions.
 * Controller functions are called with an instance of this
 */
class Request {
	/**
	 * Creates a new wrapper
	 * @param {ClientRequest} req The http module's client request class
	 * @param {ServerResponse} res The http module's server response class
	 */
	constructor(req, res) {
		this.req = req;
		this.res = res;
		this.database = require('../database/Connector').getInstance();
		this.configManager = require('../config/ConfigManager').getInstance();
		this.mailer = require('../mail/Mailer').getInstance();
	}

	/**
	 * Replies to a HTTP request
	 * @param {Error|Buffer|Object|String} data The body to send
	 * @param {String} type The content type
	 */
	respond(data, type) {

		if (data instanceof Error) {
			this.status = this.status || 400;
			this.res.setHeader('Content-Type', 'text/plain');
			this.message = data.message || 'Bad Request';
		} else if (Buffer.isBuffer(data)) {
			this.res.setHeader('Content-Type', type || 'application/octet-stream');
			this.message = data;
		} else if (typeof data === 'object') {

			try {
				this.res.setHeader('Content-Type', 'application/json');
				this.message = JSON.stringify(data);
			} catch (err) {
				return this.error(err);
			}

		} else {
			this.res.setHeader('Content-Type', type || 'text/plain');
			this.message = (data === undefined ? '' : data).toString();
		}

		this.res.setHeader('Access-Control-Allow-Origin', this.origin || '*');
		this.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

		this.res.writeHead(this.status || 200);
		this.res.end(this.message);
		console.log(`[HANDLER] Request Finished: ${this.pathname} loaded in ${Date.now() - this.invokedAt}ms (Status: ${this.status || 200})`); // eslint-disable-line no-console
	}

	/**
	 * Replies with a 200 OK for CORS purposes
	 */
	options(origin) {
		this.status = 200;
		this.origin = origin;
		this.respond();
	}

	/**
	 * Replies with a 405 Method Not Allowed
	 */
	notAllowed() {
		this.status = 405;
		this.respond(new Error('Method Not Allowed'));
	}

	/**
	 * Replies with a 401 Unauthorized
	 * @param {String} [message] The alternative message to send
	 */
	unauthorized(reason) {
		this.status = 401;
		this.respond(new Error(reason || 'Unauthorized'));
	}

	/**
	 * Replies with a 403 Forbidden
	 * @param {String} [message] The alternative message to send
	 */
	forbidden(reason) {
		this.status = 403;
		this.respond(new Error(reason || 'Forbidden'));
	}

	/**
	 * Replies with a 404 Not Found
	 * @param {String} [message] The alternative message to send
	 */
	notFound(reason) {
		this.status = 404;
		this.respond(new Error(reason || 'Not Found'));
	}

	/**
	 * Replies with a 500 Internal Server Error and sends email logs
	 * @param {Error} err 
	 */
	error(err) {
		console.error(err); // eslint-disable-line no-console

		for (const email of this.configManager.emails.error) {
			this.mailer.sendMail(email, 'API Error', 'error', {
				message: err.toString(),
				stack: err.stack,
				time: (new Date()).toString()
			});
		}

		this.status = 500;
		this.respond(new Error('Internal Server Error'));
	}

	/**
	 * Checks for authorization
	 * @returns {(Promise<Object>|Promise<false>)} The authorized user model or false if no user is authenticated
	 */
	async getAuthorization() {
		const header = this.req.headers.authorization;
		if (!header) return new Error('Missing Access Token');

		const [type, token] = header.split(' ');
		if (!type || !token) return new Error('Invalid Access Token');

		const tokenQuery = await this.database.query('SELECT token, type, user_id FROM access_tokens WHERE type = $1 AND token = $2', [type.toLowerCase(), token]);
		if (tokenQuery.rowCount !== 1) return new Error('Invalid Access Token');

		const userQuery = await this.database.query('SELECT * FROM users WHERE id = $1', [tokenQuery.rows[0].user_id]);
		if (!userQuery.rowCount) return new Error('User Not Found');

		const user = new User(userQuery.rows[0]);
		if (user.badgeHandler.has('deleted')) return new Error('Your account has been terminated');

		return user;
	}
}

module.exports = HTTPHandler;
