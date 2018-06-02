const crypto = require('crypto');
const DatabaseConnector = require('../utils/database/Connector');

class VerificationToken {

	/**
	 * Creates a verification token for the given user
	 * @param {String} userID The user's ID 
	 * @returns {String} The created token
	 */
	static async create(userID) {
		const database = DatabaseConnector.getInstance();

		const dbQuery = await database.query('INSERT INTO verification_tokens(user_id, token) VALUES ($1, $2) RETURNING *', [userID, VerificationToken.generate()]);
		return dbQuery.rows[0].token;
	}

	/**
	 * Returns a 8-character random verification token using the supplied arguments
	 * @returns {String} The generated access token
	 */
	static generate() {
		return crypto.randomBytes(3).toString('hex');
	}

	static get databaseModel() {
		return ['verification_tokens', {
			name: 'user_id',
			type: 'bigint',
			notNull: true
		}, {
			name: 'token',
			type: 'VARCHAR(6)',
			notNull: true
		}];
	}

}

module.exports = VerificationToken;
