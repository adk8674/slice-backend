const Controller = require('../../utils/http/Controller');
const User = require('../../models/User');
const AccessToken = require('../../models/AccessToken');

class AccessTokenController extends Controller {

	async show() {
		const dbQuery = await this.database.query('SELECT user_id FROM access_tokens WHERE token = $1', [this.params.route.token]);
		if (!dbQuery.rowCount) return this.notFound();

		const userQuery = await this.database.query('SELECT * FROM users WHERE id = $1', [dbQuery.rows[0].user_id]);
		if (!dbQuery.rowCount) return this.error(new Error('User Not Found'));

		const user = new User(userQuery.rows[0]);
		this.respond(user.toAPIResponse());
	}

	async create() {
		const userQuery = await this.database.query('SELECT * FROM users WHERE email = $1', [this.params.body.email]);
		if (!userQuery.rowCount) return this.respond(new Error('Invalid E-Mail address'));

		const user = new User(userQuery.rows[0]);
		if (!user.checkPassword(this.params.body.password)) return this.respond(new Error('Invalid password'));

		const accessToken = new AccessToken({
			user_id: user.id,
			type: 'bearer',
			token: AccessToken.generate(),
			ip: this.req.connection.remoteAddress,
			created_at: Date.now()
		});

		const createdToken = await accessToken.save();
		this.respond(createdToken.toAPIResponse());
	}

}

module.exports = AccessTokenController;
