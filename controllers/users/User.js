const Controller = require('../../utils/http/Controller');
const User = require('../../models/User');

class UserController extends Controller {

	async index() {
		const auth = await this.getAuthorization();
		if (auth instanceof Error) return this.unauthorized(auth);

		if (!auth.badgeHandler.has('admin')) return this.forbidden();

		const dbResults = await this.database.query('SELECT * FROM users');
		const users = dbResults.rows.map(userRow => new User(userRow));

		this.respond(users.map(user => user.toAPIResponse()));
	}

	async show() {
		const auth = await this.getAuthorization();

		let listEmail = false;
		if (!(auth instanceof Error) && (auth.badgeHandler.has('mod') || auth.id === this.params.route.id)) listEmail = true;

		const dbResults = await this.database.query('SELECT * FROM users WHERE id = $1', [this.params.route.id]);
		if (dbResults.rowCount < 1) return this.notFound('Invalid User');

		const user = new User(dbResults.rows[0]);
		this.respond(user.toAPIResponse(listEmail));
	}

	async create() {
		const avatarData = this.params.body.avatar;
		this.params.body.avatar = !!avatarData;

		if (this.params.body.bot) {
			const auth = await this.getAuthorization();
			if (auth instanceof Error) return this.unauthorized(auth);

			const user = new User({
				bot: true,
				owner_id: auth.id
			});

			this.params.body.badges = ['verified'];

			user.edit(this.params.body);

			const result = await user.create();
			if (result instanceof Error) return this.respond(result);

			if (this.params.body.avatar) {
				try {
					await User.saveAvatar(result.id, avatarData);
				} catch (err) {
					result.edit({
						avatar: false
					});

					await result.save();
				}
			}

			this.respond(result.toAPIResponse(true));
		} else {
			const user = new User({
				bot: false
			});

			user.edit(this.params.body);

			let result;

			try {
				result = await user.create();
			} catch (err) {
				if (err.message.includes('users_email_key')) return this.respond(new Error('E-Mail address is already in use'));
				return this.error(err);
			}

			if (result instanceof Error) return this.respond(result);

			if (this.params.body.avatar) {
				try {
					await User.saveAvatar(result.id, avatarData);
				} catch (err) {
					result.edit({
						avatar: false
					});

					await result.save();
				}
			}

			this.respond(result.toAPIResponse(true));
		}
	}

	async update() {
		const auth = await this.getAuthorization();
		if (auth instanceof Error) return this.unauthorized(auth);

		const userQuery = await this.database.query('SELECT * FROM users WHERE id = $1', [this.params.route.id]);
		if (!userQuery.rowCount) return this.notFound('Invalid User');

		const user = new User(userQuery.rows[0]);

		if (auth.id !== user.id && !auth.badgeHandler.has('mod')) return this.forbidden();

		if (!auth.badgeHandler.has('admin')) this.params.body.badges = user.badges;

		if (typeof this.params.body.avatar === 'string') {
			try {
				await User.saveAvatar(user.id, this.body.avatar);
				this.params.body.avatar = true;
			} catch (err) {
				await User.saveAvatar(user.id, null);
				this.params.body.avatar = false;
			}
		}

		user.edit(this.params.body);

		let result;
		try {
			result = await user.save();
		} catch (err) {
			if (err.message.includes('users_email_key')) return this.respond(new Error('E-Mail address is already in use'));
			return this.error(err);
		}

		if (result instanceof Error) return this.respond(result);

		this.respond(result.toAPIResponse(true));
	}

	async delete() {
		const auth = await this.getAuthorization();
		if (auth instanceof Error) return this.unauthorized(auth);

		const userQuery = await this.database.query('SELECT * FROM users WHERE id = $1', [this.params.route.id]);
		if (!userQuery.rowCount) return this.notFound('Invalid User');

		const user = new User(userQuery.rows[0]);

		if (auth.id !== user.id && !auth.badgeHandler.has('mod')) return this.forbidden();

		const result = await user.delete();
		this.respond(result.toAPIResponse(true));
	}

}

module.exports = UserController;
