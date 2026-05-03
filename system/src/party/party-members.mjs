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
 * Collect Effect-type items that have tokenIcon.show enabled.
 * @param {ActorSD} actor
 * @returns {{ effects: Array<{name: string, icon: string}> }}
 */
export function collectEffects(actor) {
	const effects = Array.from(actor.items)
		.filter(i => i.type === "Effect" && i.system.tokenIcon?.show)
		.map(i => ({ name: i.name, icon: i.img }));
	return { effects };
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
 * @returns {string}
 */
export function computeHpClass(hp, hpMax) {
	if (hp <= 0) return "sd-party-hp--dead";
	const fraction = hpMax > 0 ? hp / hpMax : 0;
	if (fraction < 0.5) return "sd-party-hp--damaged";
	return "";
}
