class Router {

	constructor() {
		this.routes = [];
	}

	/**
	 * 
	 * @param {string} route The route to match
	 * @param {Controller} controller The controller to instantiate
	 */
	route(route, Controller) {
		this.routes.push({
			controller: new Controller(),
			route,
			pathRegex: Router.parsePathRegex(route)
		});
	}

	static parsePathRegex(str) {
		let names = [];
		let replacements = [];

		str = str.replace(/(\{(\w+?)\}|(\*))/g, (m, all, name) => {
			names.push(name);
			replacements.push((all === '*' ? '(.*?)' : '([^/]+?)'));
			return `{${replacements.length - 1}}`;
		});

		str = str.replace(/\/\{([^/]*?)\}$/g, (m, i) => {
			replacements[i | 0] = `(?:/${replacements[i | 0]})?`;
			return `{${i | 0}}`;
		});

		let final = str.replace(/\{(.*?)\}/g, (m, i) => {
			return replacements[i | 0];
		});

		return {
			regex: new RegExp(`^${final}/?$`),
			names: names
		};
	}

}

module.exports = Router;
