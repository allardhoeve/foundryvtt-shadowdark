import { computePartyOwnership } from "./party-ownership.mjs";
import { isMemberOf } from "./party-members.mjs";

const NO_LIGHT = { bright: 0, dim: 0 };

let _lightMappings = null;

async function getLightMappings() {
	if (!_lightMappings) {
		_lightMappings = await foundry.utils.fetchJsonWithTimeout(
			"systems/shadowdark/assets/mappings/map-light-sources.json"
		);
	}
	return _lightMappings;
}

export async function syncPartyState(partyActor) {
	const mappings = await getLightMappings();

	const memberActors = [];
	for (const uuid of partyActor.system.members) {
		const actor = await fromUuid(uuid);
		if (actor) memberActors.push(actor);
	}

	// Compute max light reach across all active member light sources
	let maxBright = 0;
	let maxDim = 0;
	let bestLight = null;

	for (const actor of memberActors) {
		for (const item of await actor.getActiveLightSources()) {
			const mapping = mappings[item.system.light?.template];
			if (!mapping) continue;
			const light = mapping.light;
			if ((light.bright ?? 0) > maxBright) maxBright = light.bright ?? 0;
			if ((light.dim ?? 0) > maxDim) maxDim = light.dim ?? 0;
			const reach = Math.max(light.bright ?? 0, light.dim ?? 0);
			const bestReach = bestLight
				? Math.max(bestLight.bright ?? 0, bestLight.dim ?? 0) : 0;
			if (reach > bestReach) bestLight = light;
		}
	}

	const hasLight = maxBright > 0 || maxDim > 0;
	const lightData = hasLight
		? { ...bestLight, bright: maxBright, dim: maxDim }
		: NO_LIGHT;
	const sightData = {
		enabled: hasLight,
		range: Math.max(maxBright, maxDim),
	};

	const ownership = computePartyOwnership(
		memberActors.map(a => a.ownership),
		Array.from(game.users)
	);

	// Apply light/sight to all tokens for this actor across all scenes
	for (const scene of game.scenes) {
		const tokens = scene.tokens.filter(t => t.actorId === partyActor._id);
		for (const token of tokens) {
			await token.update({ light: lightData, sight: sightData });
		}
	}

	await partyActor.update({
		ownership,
		"prototypeToken.light": lightData,
		"prototypeToken.sight": sightData,
	});
}

export const syncAllPartyActors = foundry.utils.debounce(async () => {
	for (const actor of game.actors) {
		if (actor.type === "Party") await syncPartyState(actor);
	}
}, 250);

export function isPartyMember(actorId) {
	for (const actor of game.actors) {
		if (actor.type !== "Party") continue;
		if (isMemberOf(actor.system.members, actorId)) return true;
	}
	return false;
}
