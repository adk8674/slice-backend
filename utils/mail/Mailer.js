const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

let instance;

/**
 * A wrapper around nodemailer with utility functions
 */
class Mailer {

	/**
	 * Creates a new mailer. Mailers are automatically instantiated; use `Mailer.getInstance` instead
	 * @param {Object} [config] The configuration to use
	 * @param {Object} [config.options] The options to pass to nodemailer
	 * @param {Object} [config.defaults] The defaults to use
	 */
	constructor({
		options,
		defaults
	} = {}) {
		this.transporter = nodemailer.createTransport(options, defaults);
		instance = this;
	}

	/**
	 * Returns the last instantiated mailer
	 * @returns {Mailer?} The last instantiated mailer
	 */
	static getInstance() {
		return instance;
	}

	/**
	 * 
	 * @param {String} to Email address to send the email to
	 * @param {String} subject The email's subject
	 * @param {String} template The email's template name
	 * @param {Object<String, String>} replacements The replacement values for the email template
	 */
	sendMail(to, subject, template, replacements) {

		const templateDir = path.resolve(path.join('templates', 'email', `${template}.html`));

		return new Promise((resolve, reject) => {

			fs.exists(templateDir, (exists) => {
				if (!exists) return reject(new Error(`Template "${template}" does not exist`));

				fs.readFile(templateDir, (err, data) => {
					if (err) return reject(err);

					let templateString = data.toString();
					templateString = templateString.replace(/{{([^}]+)}}/g, (match, key) => Mailer.sanitizeReplacement(replacements[key] || 'MISSING_REPLACE_VALUE'));

					this.transporter.sendMail({
						to,
						subject,
						html: templateString
					}).then(resolve).catch(reject);
				});

			});

		});

	}

	static sanitizeReplacement(value) {
		return (value || '')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/&/g, '&amp;')
			.replace(/\n/g, '<br />');
	}

}

module.exports = Mailer;
