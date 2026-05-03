const OWNER = 3; // CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER

/**
 * Compute the party actor's ownership map from member actor ownerships.
 * Any user who owns at least one member actor gets owner access to the party.
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
		}
	}

	for (const user of users) {
		if (user.isGM) ownership[user.id] = OWNER;
	}

	return ownership;
}
