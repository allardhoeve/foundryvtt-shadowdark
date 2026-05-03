import ActorSheetBaseSD from "./ActorSheetBaseSD.mjs";
import {
	collectEffects,
	computeHpClass,
	computeSlotStatus,
	countLightSources,
	countRations,
	isMemberOf,
} from "../party/party-members.mjs";
import { mergePartyTokens, explodePartyTokens } from "../party/party-tokens.mjs";

export default class PartySheetSD extends ActorSheetBaseSD {

	#hookIds = [];

	static DEFAULT_OPTIONS = foundry.utils.mergeObject(
		ActorSheetBaseSD.DEFAULT_OPTIONS,
		{
			classes: ["shadowdark-app", "shadowdark-party"],
			position: { width: 480, height: 600 },
			window: {
				contentClasses: ["shadowdark", "sheet", "party"],
			},
			actions: {
				"open-member": PartySheetSD.prototype._onOpenMember,
				"remove-member": PartySheetSD.prototype._onRemoveMember,
				"merge-tokens": PartySheetSD.prototype._onMergeTokens,
				"explode-tokens": PartySheetSD.prototype._onExplodeTokens,
			},
		},
		{ inplace: false }
	);

	static PARTS = {
		form: {
			template: "systems/shadowdark/templates/actors/party.hbs",
			scrollable: [".sd-party-members"],
		},
	};

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.members = await this._getMemberData();
		context.isEmpty = context.members.length === 0;
		context.merged = this.actor.system.merged;
		context.isGM = game.user.isGM;

		context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
			this.actor.system.notes,
			{
				secrets: this.actor.isOwner,
				async: true,
				relativeTo: this.actor,
			}
		);

		return context;
	}

	/** @override */
	async _onRender(context, options) {
		await super._onRender(context, options);

		new foundry.applications.ux.ContextMenu.implementation(
			this.element,
			".sd-party-member",
			[
				{
					name: game.i18n.localize("SHADOWDARK.sheet.party.members.open_tooltip"),
					icon: '<i class="fas fa-external-link-alt"></i>',
					callback: async element => {
						const actor = await fromUuid(element.dataset.uuid);
						actor?.sheet?.render(true);
					},
				},
				{
					name: game.i18n.localize("SHADOWDARK.sheet.party.members.remove_tooltip"),
					icon: '<i class="fas fa-trash"></i>',
					callback: element => {
						this.actor.update({
							"system.members": this.actor.system.members.filter(
								m => m !== element.dataset.uuid
							),
						});
					},
				},
			],
			{ jQuery: false }
		);

		if (options.isFirstRender) this._registerHooks();
	}

	/** @override */
	async _onClose(options) {
		this._unregisterHooks();
		return super._onClose(options);
	}

	/** @override */
	async _onDropActor(event, data) {
		const actor = await fromUuid(data.uuid);
		if (!actor) return null;

		if (actor.type !== "Player" && actor.type !== "NPC") {
			ui.notifications.warn(
				game.i18n.localize("SHADOWDARK.sheet.party.warn.character_only")
			);
			return null;
		}

		if (isMemberOf(this.actor.system.members, actor.id)) return null;

		await this.actor.update({
			"system.members": [...this.actor.system.members, actor.uuid],
		});
	}

	async _onOpenMember(event, target) {
		const actor = await fromUuid(target.dataset.uuid);
		actor?.sheet?.render(true);
	}

	async _onRemoveMember(event, target) {
		const uuid = target.dataset.uuid;
		await this.actor.update({
			"system.members": this.actor.system.members.filter(m => m !== uuid),
		});
	}

	async _onMergeTokens() {
		await mergePartyTokens(this.actor);
	}

	async _onExplodeTokens() {
		await explodePartyTokens(this.actor);
	}

	async _getMemberData() {
		const members = [];

		for (const uuid of this.actor.system.members) {
			const actor = await fromUuid(uuid);
			if (!actor) continue;

			const hp = actor.system.attributes.hp.value;
			const hpMax = actor.system.attributes.hp.max;
			const { statuses, effects } = collectEffects(actor);
			const hpClass = computeHpClass(hp, hpMax, statuses);
			const rations = countRations(actor.items);
			const lightSources = countLightSources(actor.items);
			const hasLight = (await actor.getActiveLightSources()).length > 0;
			const { hasSlots, used, max, over } = computeSlotStatus(actor.system);

			members.push({
				uuid,
				name: actor.name,
				img: actor.img,
				hp,
				hpMax,
				hpClass,
				rations,
				lightSources,
				hasLight,
				hasSlots,
				used,
				max,
				over,
				effects,
			});
		}

		return members;
	}

	_registerHooks() {
		const refresh = foundry.utils.debounce(() => {
			if (this.rendered) this.render({ force: false });
		}, 250);

		const isMember = actorId => isMemberOf(this.actor.system.members, actorId);
		const isMemberChild = doc => isMember(doc.parent?._id);

		const register = (name, fn) => {
			const id = Hooks.on(name, fn);
			this.#hookIds.push({ name, id });
		};

		register("updateActor", actor => {
			if (isMember(actor._id)) refresh();
		});
		register("updateItem", item => {
			if (isMemberChild(item)) refresh();
		});
		register("createItem", item => {
			if (isMemberChild(item)) refresh();
		});
		register("deleteItem", item => {
			if (isMemberChild(item)) refresh();
		});
		register("createActiveEffect", effect => {
			if (isMemberChild(effect)) refresh();
		});
		register("updateActiveEffect", effect => {
			if (isMemberChild(effect)) refresh();
		});
		register("deleteActiveEffect", effect => {
			if (isMemberChild(effect)) refresh();
		});
	}

	_unregisterHooks() {
		for (const { name, id } of this.#hookIds) {
			Hooks.off(name, id);
		}
		this.#hookIds = [];
	}
}
