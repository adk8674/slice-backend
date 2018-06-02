const Controller = require('../utils/http/Controller');
const packageInfo = require('../package.json');

class Index extends Controller {

	async show() {
		this.respond(`Slice API @ v${packageInfo.version}`);
	}

}

module.exports = Index;
