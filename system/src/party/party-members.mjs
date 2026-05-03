/**
 * Count carried (non-stashed) rations.
 * @param {Collection} items
 * @returns {number}
 */
export function countRations(items) {
	return Array.from(items)
		.filter(i => i.name.toLowerCase() === "rations" && !i.system.stashed)
		.reduce((sum, i) => sum + (i.system.quantity ?? 0), 0);
}

/**
 * Count carried (non-stashed) light source items.
 * @param {Collection} items
 * @returns {number}
 */
export function countLightSources(items) {
	return Array.from(items)
		.filter(i => i.system.light?.isSource && !i.system.stashed)
		.reduce((sum, i) => sum + (i.system.quantity ?? 0), 0);
}

/**
 * Compute slot usage status. Returns hasSlots=false for actor types that
 * have no slot capacity (e.g. NPCs).
 * @param {TypeDataModel} system - Actor's system data model
 * @returns {{ hasSlots: boolean, used: number|null, max: number|null, over: boolean }}
 */
export function computeSlotStatus(system) {
	if (system.slots == null) return { hasSlots: false, used: null, max: null, over: false };
	const slots = system.getSlotUsage();
	const max = system.slots;
	return { hasSlots: true, used: slots.total, max, over: slots.total > max };
}

/**
 * Collect non-suppressed active effects that carry at least one status.
 * @param {ActorSD} actor
 * @returns {{ statuses: Set<string>, effects: Array<{name: string, icon: string}> }}
 */
export function collectEffects(actor) {
	const active = Array.from(actor.allApplicableEffects())
		.filter(e => !e.isSuppressed && e.statuses.size > 0);
	const statuses = new Set(active.flatMap(e => [...e.statuses]));
	const effects = active.map(e => ({ name: e.name, icon: e.img ?? e.icon ?? "" }));
	return { statuses, effects };
}

/**
 * Check whether an actor ID is listed in a party's members UUID array.
 * @param {string[]} memberUuids
 * @param {string} actorId
 * @returns {boolean}
 */
export function isMemberOf(memberUuids, actorId) {
	return memberUuids.includes(`Actor.${actorId}`);
}

/**
 * Compute the CSS modifier class for a member's HP display.
 * @param {number} hp
 * @param {number} hpMax
 * @param {Set<string>} statuses
 * @returns {string}
 */
export function computeHpClass(hp, hpMax, statuses) {
	if (statuses.has("dead")) return "sd-party-hp--dead";
	const fraction = hpMax > 0 ? hp / hpMax : 0;
	if (fraction < 0.5) return "sd-party-hp--damaged";
	return "";
}
