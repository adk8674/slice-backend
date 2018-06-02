const badgeRanking = ['unverified', 'verified', 'deleted', 'mod', 'admin'];

/**
 * A badge wrapper for users; used for comparing badges and checking permissions
 */
class BadgeHandler {

	/**
	 * Creates a BadgeHandler
	 * @param {String[]} badges 
	 */
	constructor(badges = []) {
		this.badges = badges;
	}

	/**
	 * Returns an array of badges in the BadgeHandler, sorted by permissions
	 * @returns {String[]} Sorted badges
	 */
	sort() {
		for (const badge in this.badges)
			if (!badgeRanking.includes(badge)) throw new Error(`User has invalid badge: ${badge}`);

		return this.badges.sort((a, b) => badgeRanking.indexOf(b) - badgeRanking.indexOf(a));
	}

	/**
	 * Gets the highest badge in the BadgeHandler, sorted by permissions
	 * @returns {String} The highest badge
	 */
	getHighest() {
		return BadgeHandler.sort(this.badges)[0];
	}

	/**
	 * Checks if the BadgeHandler contains a badge
	 * @param {String} badgeName The badge name to check for 
	 * @returns {Boolean} Wether the BadgeHandler contains the badge
	 */
	has(badgeName = '') {
		if (!badgeRanking.includes(badgeName.toLowerCase())) throw new Error(`Tried to check invalid badge: ${badgeName}`);
		return this.badges.includes(badgeName.toLowerCase());
	}

}

module.exports = BadgeHandler;
