const BadgeHandler = require('./BadgeHandler');
const DatabaseConnector = require('../utils/database/Connector');
const ConfigManager = require('../utils/config/ConfigManager');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const gm = require('gm').subClass({
	imageMagick: true
});

/**
 * Utility class for users
 */
class User {

	/**
	 * Create a user model
	 * @param {Object} [data] The data to create the model from
	 * @param {String} [data.id] The user's ID
	 * @param {String?} [data.email] The user's email address
	 * @param {String} [data.password] The user's password hash
	 * @param {String} [data.username] The user's username
	 * @param {String} [data.discriminator] The user's discriminator
	 * @param {Boolean} [data.avatar] Wether the user has an avatar or not
	 * @param {String[]} [data.badges] The user's badges
	 * @param {Boolean} [data.bot] Wether the user is a bot
	 * @param {String?} [data.owner_id] The user's owner ID (if it's a bot)
	 */
	constructor(data = {}) {
		this.id = data.id;
		this.email = data.email;
		this._password = data.password;
		this.username = data.username;
		this.discriminator = data.discriminator;
		this.avatar = data.avatar;
		this.badges = data.badges || [];
		this.bot = data.bot || false;
		this.owner_id = data.owner_id || undefined;

		this.badgeHandler = new BadgeHandler(this.badges);
		this.database = DatabaseConnector.getInstance();
	}

	/**
	 * Returns an API model of the user
	 * @param {Boolean} [withEmail] Wether to add the user's email address to the response 
	 * @returns {Object} The API response
	 */
	toAPIResponse(withEmail) {
		return {
			id: this.id,
			email: withEmail ? this.email : undefined,
			username: this.username,
			discriminator: this.discriminator,
			avatar: this.avatar,
			badges: this.badges,
			bot: this.bot,
			owner_id: this.owner_id
		};
	}

	/**
	 * Edits the user's data internally. Use **User#save** to save it to the database
	 * @param {Object} [data] The updated user data
	 * @param {String} [data.email] The user's new email address
	 * @param {String} [data.password] The user's new password (unhashed)
	 * @param {String} [data.username] The user's new username
	 * @param {Boolean} [data.avatar] Wether the user now has an avatar or not
	 * @param {String[]} [data.badges] The user's new badges
	 * @returns {User} The edited user
	 */
	edit(data = {}) {
		this.email = data.email || this.email;
		this.username = data.username || this.username;
		this.avatar = data.avatar === undefined ? this.avatar : !!data.avatar;
		this.badges = data.badges || this.badges;
		this.password = data.password || undefined;

		return this;
	}

	/**
	 * Sets a users status to deleted
	 * @returns {Promise<User>} The deleted user
	 */
	async delete() {
		const result = await this.database.query('UPDATE users SET badges = \'{"deleted"}\' WHERE id = $1 RETURNING *', [this.id]);
		return new User(result.rows[0]);
	}

	/**
	 * Updates the database model with the current model
	 * @returns {Promise<User>} The saved model
	 */
	async save() {
		const check = await this.check();
		if (check instanceof Error) return check;

		if (this.bot) {
			await this.database.query('UPDATE users SET username = $2, discriminator = $3, badges = $4 WHERE id = $1', [this.id, this.username, this.discriminator, this.badges]);
			return this;
		}

		if (this.password) {
			await this.database.query('UPDATE users SET email = $2, password = $3, username = $4, discriminator = $5, badges = $6 WHERE id = $1', [this.id, this.email, this.password, this.username, this.discriminator, this.badges]);
			//TODO invalidate all access tokens
			return this;
		}

		await this.database.query('UPDATE users SET email = $2, username = $3, discriminator = $4, badges = $5 WHERE id = $1', [this.id, this.email, this.username, this.discriminator, this.badges]);
		return this;
	}

	async create() {
		this.badges = ['unverified'];
		this.discriminator = User.generateDiscriminator();

		const check = await this.check();
		if (check instanceof Error) return check;

		const result = await this.database.query('INSERT INTO users(email, username, discriminator, avatar, password, badges, bot, owner_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [this.email, this.username, this.discriminator, this.avatar, this.password, this.badges, this.bot, this.owner_id]);
		return new User(result.rows[0]);
	}

	async check() {
		if (!/^.+@.+\.\w{2,}$/.test(this.email || '')) return new Error('Invalid E-Mail address');

		this.username = User.sanitizeName(this.username);
		if (this.username.length < 3) return new Error('Username has to be at least 3 characters');
		if (this.username.length > 32) return new Error('Username cannot exceed 32 characters');

		if (this.password) {
			if (this.password.length < 8) return new Error('Passwords have to be at least 8 characters');

			this.password = await User.hashPassword(this.password);
			this._password = this.password;
		} else if (!this._password) {
			return new Error('Passwords have to be at least 8 characters');
		}

		for (let i = 0; i <= 2; i++) {
			const otherUsersQuery = await this.database.query('SELECT count(*) FROM users WHERE username = $1 AND discriminator = $2 AND id != $3', [this.username, this.discriminator, this.id || 0]);
			if (otherUsersQuery.rows[0].count > 0) {
				this.discriminator = User.generateDiscriminator();
				continue;
			}

			return true;
		}

		return new Error('Too many users with that username exist already');
	}

	/**
	 * Compares an unhashed password to the user's hashed password
	 * @param {String} password The unhashed password to compare 
	 * @returns {Promise<Boolean>} Wether the passwords match
	 */
	checkPassword(password) {
		return bcrypt.compare(password, this._password);
	}

	static sanitizeName(name) {
		return (name || '').replace(/\s+/, ' ');
	}

	static generateDiscriminator() {
		return Math.floor(Math.random() * 1679615).toString(36).padStart(4, 0);
	}

	static hashPassword(password) {
		return bcrypt.hash(password, 10);
	}

	/**
	 * Saves a user's avatar
	 * @param {String} userID The user's ID
	 * @param {String?} avatarData The avatar data (as a base64 (`data:image/type;base64,`) data URL) or null (to delete the user's avatar)
	 * @returns {Promise} Resolves when saved; rejects when failed to save
	 */
	static saveAvatar(userID, avatarData) {
		const configManager = ConfigManager.getInstance();
		const avatarPath = path.join(configManager.storage.avatars, `${userID}.png`);

		return new Promise((resolve, reject) => {
			if (avatarData === null) {
				fs.unlink(avatarPath, () => {
					return resolve();
				});

				return;
			}

			const data = avatarData.match(/^data:image\/(jpeg|png|gif);base64,(.+);?$/);
			if (!data) return reject(new Error('Invalid avatar base64'));
			const originalBuffer = Buffer.from(data[2], 'base64');

			const magikObj = gm(originalBuffer)
				.autoOrient()
				.size((err, dimensions) => {
					if (err) return reject(err);

					const maxSize = Math.max(dimensions.width, dimensions.height);

					magikObj
						.out('-thumbnail', `${maxSize}x${maxSize}`, '-background', 'transparent', '-gravity', 'center', '-extent', `${maxSize}x${maxSize}`)
						.write(avatarPath, (err) => {
							if (err) return reject(err);
							resolve();
						});
				});

		});

	}

	static get databaseModel() {
		return ['users', {
			name: 'id',
			type: 'SNOWFLAKE'
		}, {
			name: 'email',
			type: 'VARCHAR(256)',
			unique: true
		}, {
			name: 'password',
			type: 'VARCHAR(60)',
			notNull: true
		}, {
			name: 'username',
			type: 'VARCHAR(32)',
			notNull: true
		}, {
			name: 'discriminator',
			type: 'CHAR(4)',
			notNull: true
		}, {
			name: 'avatar',
			type: 'boolean',
			notNull: true
		}, {
			name: 'badges',
			type: 'VARCHAR(32)[]',
			notNull: true
		}, {
			name: 'bot',
			type: 'BOOLEAN',
			notNull: true
		}, {
			name: 'owner_id',
			type: 'BIGINT'
		}];
	}

}

module.exports = User;
