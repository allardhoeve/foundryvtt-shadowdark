// Clockwise spiral: origin, inner ring (8), outer ring (16).
const SPIRAL_OFFSETS = [
	{ x: 0, y: 0 },
	{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
	{ x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
	{ x: -1, y: -2 }, { x: 0, y: -2 }, { x: 1, y: -2 }, { x: 2, y: -2 },
	{ x: 2, y: -1 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 },
	{ x: 1, y: 2 }, { x: 0, y: 2 }, { x: -1, y: 2 }, { x: -2, y: 2 },
	{ x: -2, y: 1 }, { x: -2, y: 0 }, { x: -2, y: -1 }, { x: -2, y: -2 },
];

function findMemberTokens(scene, memberUuids) {
	const tokens = [];
	for (const uuid of memberUuids) {
		const actorId = uuid.split(".").pop();
		const token = scene.tokens.find(t => t.actorId === actorId);
		if (token) tokens.push(token);
	}
	return tokens;
}

function findPartyToken(scene, partyActorId) {
	return scene.tokens.find(t => t.actorId === partyActorId);
}

function findSafePosition(originX, originY, offset, gridSize, tokenW, tokenH) {
	const targetX = originX + (offset.x * gridSize);
	const targetY = originY + (offset.y * gridSize);

	let finalX = originX;
	let finalY = originY;

	const steps = Math.max(Math.abs(offset.x), Math.abs(offset.y));
	if (steps === 0) return { x: originX, y: originY };

	const originCenter = { x: originX + (tokenW / 2), y: originY + (tokenH / 2) };

	for (let i = 1; i <= steps; i++) {
		const stepX = originX + ((targetX - originX) * (i / steps));
		const stepY = originY + ((targetY - originY) * (i / steps));
		const stepCenter = { x: stepX + (tokenW / 2), y: stepY + (tokenH / 2) };

		if (CONFIG.Canvas.polygonBackends.move.testCollision(
			originCenter, stepCenter, { type: "move", mode: "any" }
		)) break;

		const snapped = canvas.grid.getSnappedPoint(
			{ x: stepX, y: stepY },
			{ mode: CONST.GRID_SNAPPING_MODES.VERTEX }
		);
		finalX = snapped.x;
		finalY = snapped.y;
	}

	return { x: finalX, y: finalY };
}

export async function mergePartyTokens(partyActor) {
	const scene = canvas.scene;
	if (!scene) {
		ui.notifications.warn(game.i18n.localize("SHADOWDARK.sheet.party.warn.no_scene"));
		return;
	}

	const memberTokens = findMemberTokens(scene, partyActor.system.members);
	if (memberTokens.length === 0) {
		ui.notifications.warn(game.i18n.localize("SHADOWDARK.sheet.party.warn.no_member_tokens"));
		return;
	}

	const anchor = memberTokens[0];
	const tokenIds = memberTokens.map(t => t._id);
	await scene.deleteEmbeddedDocuments("Token", tokenIds);

	const tokenData = partyActor.prototypeToken.toObject();
	tokenData.actorId = partyActor._id;
	tokenData.actorLink = true;
	tokenData.x = anchor.x;
	tokenData.y = anchor.y;
	await scene.createEmbeddedDocuments("Token", [tokenData]);

	await partyActor.update({ "system.merged": true });
}

function makePositionAllocator(originX, originY, gridSize, initialClaimed = new Set()) {
	const claimed = new Set(initialClaimed);
	let index = 0;
	return function nextPosition(tokenW, tokenH) {
		while (index < SPIRAL_OFFSETS.length) {
			const offset = SPIRAL_OFFSETS[index++];
			const pos = findSafePosition(originX, originY, offset, gridSize, tokenW, tokenH);
			const key = `${pos.x},${pos.y}`;
			if (!claimed.has(key)) {
				claimed.add(key);
				return pos;
			}
		}
		return null;
	};
}

export async function explodePartyTokens(partyActor) {
	const scene = canvas.scene;
	if (!scene) {
		ui.notifications.warn(game.i18n.localize("SHADOWDARK.sheet.party.warn.no_scene"));
		return;
	}

	const partyToken = findPartyToken(scene, partyActor._id);
	if (!partyToken) {
		ui.notifications.warn(game.i18n.localize("SHADOWDARK.sheet.party.warn.no_party_token"));
		return;
	}

	const gridSize = canvas.grid.size;
	const occupied = new Set(
		scene.tokens
			.filter(t => t._id !== partyToken._id)
			.map(t => `${t.x},${t.y}`)
	);
	const nextPosition = makePositionAllocator(partyToken.x, partyToken.y, gridSize, occupied);
	const tokensToCreate = [];

	for (const uuid of partyActor.system.members) {
		const actor = await fromUuid(uuid);
		if (!actor) continue;

		const tokenData = actor.prototypeToken.toObject();
		tokenData.actorId = actor._id;
		tokenData.actorLink = true;

		const tokenW = (tokenData.width ?? 1) * gridSize;
		const tokenH = (tokenData.height ?? 1) * gridSize;
		const pos = nextPosition(tokenW, tokenH);
		if (!pos) break;

		tokenData.x = pos.x;
		tokenData.y = pos.y;
		tokensToCreate.push(tokenData);
	}

	if (tokensToCreate.length === 0) {
		ui.notifications.warn(game.i18n.localize("SHADOWDARK.sheet.party.warn.no_member_tokens"));
		return;
	}

	await scene.createEmbeddedDocuments("Token", tokensToCreate);
	await scene.deleteEmbeddedDocuments("Token", [partyToken._id]);

	await partyActor.update({ "system.merged": false });
}
