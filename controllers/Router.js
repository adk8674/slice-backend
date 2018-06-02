const Router = require('../utils/http/Router');
const router = new Router();

const Index = require('./Index');
router.route('/', Index);

const User = require('./users/User');
const VerificationToken = require('./users/VerificationToken');
const AccessToken = require('./users/AccessToken');

router.route('/users/{id}', User);
router.route('/users/{userID}/verify/{token}', VerificationToken);
router.route('/access_tokens/{token}', AccessToken);

module.exports = router;
