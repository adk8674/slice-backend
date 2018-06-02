const Controller = require('../../utils/http/Controller');
const User = require('../../models/User');

class VerificationToken extends Controller {

	async show() {
		const dbQuery = await this.database.query('DELETE FROM verification_token WHERE token = $1 AND user_id = $2 RETURNING *', [this.params.route.token, this.params.route.userID]);
		if (!dbQuery.rowCount) return this.respond(new Error('You provided an invalid verification token'));

		const userQuery = await this.database.query('SELECT * FROM users WHERE id = $1', [dbQuery.rows[0].user_id]);
		if (!userQuery.rowCount) return this.error(new Error('User Not Found'));

		const user = new User(userQuery.rows[0]);
		user.edit({
			badges: user.badges.filter(badge => badge !== 'unverified').push('verified')
		});

		await user.save();

		this.respond({
			token: this.params.route.token,
			user: user.toAPIResponse()
		});
	}

}

module.exports = VerificationToken;
