const pg = require('pg');
const fs = require('fs');
const path = require('path');

let instance;

/**
 * A PostgreSQL connector class with utility functions
 */
class DatabaseConnector {

	/**
	 * Creates a new connector. Connectors are automatically instantiated; use `DatabaseConnector.getInstance` instead
	 * @param {Object} connectionInfo Connection info to pass to the pg module
	 */
	constructor(connectionInfo) {
		this.connectionInfo = connectionInfo;
		this.pool = new pg.Pool(connectionInfo);
		instance = this;
	}

	/**
	 * Returns the last created instance of the connector
	 * @returns {DatabaseConnector?} The last created connector
	 */
	static getInstance() {
		return instance;
	}

	/**
	 * Sends a query to PostgreSQL
	 * @param {String} query The query to execute 
	 * @param {*} values The variables to replace placeholders with
	 * @returns {Object} The PostgreSQL response
	 */
	async query(text, values) {
		const client = await this.pool.connect();

		const result = await client.query({
			text,
			values
		});

		client.release();
		return result;
	}

	/**
	 * Drops all tables and rebuilds them
	 * @returns {Promise<Boolean>} Wether the preparation succeeded
	 */
	async prepare() {

		await this.pool.end();

		this.pool = new pg.Pool(Object.assign({}, this.connectionInfo, {
			database: 'postgres'
		}));

		try {
			console.log(`[PREPARE] Dropping database "${this.connectionInfo.database}"...`); // eslint-disable-line no-console
			await this.query(`DROP DATABASE ${this.connectionInfo.database}`);
		} catch (err) {
			console.log('[PREPARE] Database did not exist yet'); // eslint-disable-line no-console
		}

		console.log(`[PREPARE] Creating database "${this.connectionInfo.database}"...`); // eslint-disable-line no-console
		await this.query(`CREATE DATABASE ${this.connectionInfo.database}`);

		await this.pool.end();

		this.pool = new pg.Pool(this.connectionInfo);

		await this.query(`create sequence snowflake_generator_sequence;
		CREATE OR REPLACE FUNCTION snowflake_generator(OUT result BIGINT) AS $$
		DECLARE
			epoch bigint := 1514761200000;
			cur_millis bigint;
			seq_id bigint;
		BEGIN
			SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO cur_millis;
			SELECT nextval('snowflake_generator_sequence') % 65535 INTO seq_id;
			result := (cur_millis - epoch) << 16;
			result := result | (seq_id);
		END;
		$$ LANGUAGE PLPGSQL;`);

		await this.query('CREATE DOMAIN snowflake BIGINT DEFAULT snowflake_generator() NOT NULL');

		for (const fileName of fs.readdirSync('./models')) {
			const model = require(path.resolve(path.join('./models', fileName)));
			if (!model.databaseModel) continue;

			const databaseModel = model.databaseModel;
			const modelName = databaseModel.shift();

			console.log(`[PREPARE] Creating model "${modelName}"...`); // eslint-disable-line no-console
			const columnString = databaseModel.map(this.parseColumn).join(', ');

			await this.query(`CREATE TABLE "${modelName}" (${columnString})`);
		}

		return true;

	}

	/**
	 * Parses a column string or object to PostgreSQL's format
	 * @private
	 * @param {String|Object} column The column to parse
	 */
	parseColumn(column) {
		if (typeof column === 'string') return column;
		return `${column.name} ${column.type}${column.notNull ? ' NOT NULL' : ''}${column.unique ? ' UNIQUE' : ''}`;
	}

}

module.exports = DatabaseConnector;
