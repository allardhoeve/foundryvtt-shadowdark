const fields = foundry.data.fields;

export default class PartySD extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			members: new fields.ArrayField(
				new fields.DocumentUUIDField({ type: "Actor" }),
				{ initial: [] }
			),
			notes: new fields.HTMLField({ required: false, blank: true, initial: "" }),
			merged: new fields.BooleanField({ initial: false }),
		};
	}
}
