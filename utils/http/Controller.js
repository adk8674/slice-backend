/**
 * A controller parent class, used for default methods
 */
class Controller {

	/**
	 * Replies with a 405 Method Not Allowed. Intended to be overwritten when inherited
	 */
	index() {
		this.notAllowed();
	}

	/**
	 * Replies with a 405 Method Not Allowed. Intended to be overwritten when inherited
	 */
	show() {
		this.notAllowed();
	}

	/**
	 * Replies with a 405 Method Not Allowed. Intended to be overwritten when inherited
	 */
	create() {
		this.notAllowed();
	}

	/**
	 * Replies with a 405 Method Not Allowed. Intended to be overwritten when inherited
	 */
	update() {
		this.notAllowed();
	}

	/**
	 * Replies with a 405 Method Not Allowed. Intended to be overwritten when inherited
	 */
	delete() {
		this.notAllowed();
	}

	/**
	 * Replies with a 200 OK for CORS purposes
	 */
	options() {
		this.options();
	}

	/**
	 * Replies with a 405 Method Not Allowed (for non-overwritten handlers)
	 */
	notAllowed() {
		this.notAllowed();
	}

}

module.exports = Controller;
