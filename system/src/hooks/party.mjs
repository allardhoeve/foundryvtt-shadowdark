import { syncAllPartyActors, isPartyMember } from "../party/party-sync.mjs";

export const PartyHooks = {
	attach: () => {
		if (!game.user.isGM) return;

		const onMemberItem = doc => {
			if (isPartyMember(doc.parent?._id)) syncAllPartyActors();
		};

		Hooks.on("updateItem", onMemberItem);
		Hooks.on("createItem", onMemberItem);
		Hooks.on("deleteItem", onMemberItem);

		Hooks.on("updateActor", (actor, changes) => {
			// Re-sync when the party's member list changes
			if (actor.type === "Party"
				&& foundry.utils.hasProperty(changes, "system.members")) {
				syncAllPartyActors();
			}
			// Re-sync when a member actor changes (catches ownership changes)
			else if (actor.type !== "Party" && isPartyMember(actor._id)) {
				syncAllPartyActors();
			}
		});

		Hooks.on("canvasReady", syncAllPartyActors);
		Hooks.on("updateWorldTime", syncAllPartyActors);
	},
};
