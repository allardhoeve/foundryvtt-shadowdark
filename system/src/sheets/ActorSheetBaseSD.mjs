export default class ActorSheetBaseSD extends foundry.applications.api.HandlebarsApplicationMixin(
	foundry.applications.sheets.ActorSheetV2
) {

	static DEFAULT_OPTIONS = {
		form: {
			submitOnChange: true,
			closeOnSubmit: false,
		},
		window: {
			resizable: true,
		},
	};

	/** @override */
	async _prepareContext(options) {
		const context = await super._prepareContext(options);

		context.actor = this.actor;
		context.system = this.actor.system;
		context.editable = this.isEditable;
		context.cssClass = this.actor.isOwner ? "editable" : "locked";
		context.owner = this.actor.isOwner;

		return context;
	}

	/** @override */
	_processFormData(event, form, formData) {
		// Strip fields whose paths are currently overridden by an active effect,
		// so the post-override displayed value isn't persisted as new base data.
		const overrides = foundry.utils.flattenObject(this.actor.overrides ?? {});
		for (const key of Object.keys(overrides)) {
			delete formData.object[key];
		}
		// Defensive: predefinedEffects is unbound; never let it reach actor.update.
		delete formData.object.predefinedEffects;
		return super._processFormData(event, form, formData);
	}
}
