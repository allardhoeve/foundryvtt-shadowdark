const OWNER = 3;    // CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
const OBSERVER = 2; // CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER

/**
 * Compute the party actor's ownership map from member actor ownerships.
 * Any user who owns at least one member actor gets owner access to the party.
 * Any user who observes at least one member actor gets observer access (can
 * see the party sheet but cannot move the token).
 * GM users always retain owner access.
 * @param {Object[]} memberOwnerships - Array of ownership maps from member actors
 * @param {User[]} users
 * @returns {Object}
 */
export function computePartyOwnership(memberOwnerships, users) {
	const ownership = { default: 0 };

	for (const memberOwnership of memberOwnerships) {
		for (const [userId, level] of Object.entries(memberOwnership)) {
			if (userId === "default") continue;
			if (level >= OWNER) ownership[userId] = OWNER;
			else if (level >= OBSERVER && !(ownership[userId] >= OWNER)) {
				ownership[userId] = OBSERVER;
			}
		}
	}

	for (const user of users) {
		if (user.isGM) ownership[user.id] = OWNER;
	}

	return ownership;
}
