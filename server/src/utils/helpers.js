const { get, all, run, db } = require('../database');

/**
 * Builds the breadcrumb path for a group
 */
const buildGroupPathAsync = async (groupId) => {
    if (!groupId) return [];
    try {
        const row = await get("SELECT name, parent_id FROM groups WHERE id = ?", [groupId]);
        if (!row) return [];
        if (row.parent_id) {
            const path = await buildGroupPathAsync(row.parent_id);
            return [...path, row.name];
        }
        return [row.name];
    } catch (err) {
        console.error("Error building group path:", err);
        return [];
    }
};

/**
 * (Deprecated since we no longer save string names to person record)
 * Kept for signature compatibility right now, but we actually just rely on querying relationships table in `people.js`.
 */
const updatePersonTextField = async (personId, type) => {
    // No-op for now. The 'siblings' and 'partners' string fields on `people` are obsolete via the JSON rewrite. 
    // They will be dynamically aggregated on GET /api/people.
};

/**
 * Computes the opposite status for a given relation.
 */
const getOppositeStatus = (status, selfGender = null) => {
    // Wenn kein Geschlecht bekannt ist, nehmen wir "neutral" oder einen Standard
    const gen = (selfGender || '').toLowerCase();
    const isMale = gen === 'männlich' || gen === 'male' || gen === 'm';
    const isFemale = gen === 'weiblich' || gen === 'female' || gen === 'w' || gen === 'f';

    // Default fallback falls wir es nicht abbilden können
    let base = status;

    switch (status) {
        // Familie
        case 'Vater':
        case 'Mutter':
            return isMale ? 'Sohn' : isFemale ? 'Tochter' : 'Kind';
        case 'Sohn':
        case 'Tochter':
        case 'Kind':
            return isMale ? 'Vater' : isFemale ? 'Mutter' : 'Elternteil';
        case 'Bruder':
        case 'Schwester':
        case 'Geschwister':
            return isMale ? 'Bruder' : isFemale ? 'Schwester' : 'Geschwister';
        case 'Großvater':
        case 'Großmutter':
            return isMale ? 'Enkel' : isFemale ? 'Enkelin' : 'Enkelkind';
        case 'Enkel':
        case 'Enkelin':
        case 'Enkelkind':
            return isMale ? 'Großvater' : isFemale ? 'Großmutter' : 'Großelternteil';

        // Beziehungen
        case 'Ehepartner': return 'Ehepartner';
        case 'Verlobt': return 'Verlobt';
        case 'Feste Beziehung': return 'Feste Beziehung';
        case 'Ex-Partner': return 'Ex-Partner';
        case 'Dating': return 'Dating';
        case 'Crush': return 'Crush (Einseitig)'; // Extra Logik möglich
        case 'Crush (Einseitig)': return 'Crush';

        // Soziales
        case 'Bester Freund/Freundin': return 'Bester Freund/Freundin';
        case 'Freund/Freundin': return 'Freund/Freundin';
        case 'Bekannter/Bekannte': return 'Bekannter/Bekannte';
        case 'Nachbar/Nachbarinn': return 'Nachbar/Nachbarinn';
        case 'Mitbewohner/Mitbewohnerinn': return 'Mitbewohner/Mitbewohnerinn';

        default: return status;
    }
};

/**
 * Syncs JSON-based relationships with the relationships table.
 * payload is an array of objects: [{ name: "Max", status: "Vater" }]
 */
const syncRelationships = async (personId, relationsPayload, type = 'Familie') => {
    if (relationsPayload === undefined || relationsPayload === null) return;

    let relationsJSON = [];
    try {
        if (typeof relationsPayload === 'string') {
            relationsJSON = JSON.parse(relationsPayload);
        } else if (Array.isArray(relationsPayload)) {
            relationsJSON = relationsPayload;
        }
    } catch (e) {
        console.error("Failed to parse relationships JSON payload:", e);
        return;
    }

    const selfPerson = await get("SELECT gender FROM people WHERE id = ?", [personId]);

    // 1. Get current state from DB for this type
    const currentLinks = await all(`
        SELECT p.id, p.name, r.status 
        FROM relationships r 
        JOIN people p ON r.person_id_2 = p.id 
        WHERE r.person_id_1 = ? AND r.type = ?
    `, [personId, type]);

    // Track targets to keep
    const namesToKeep = relationsJSON.map(r => r.name.toLowerCase());

    // 2. Remove deleted links or links whose status changed
    for (const link of currentLinks) {
        const payloadMatch = relationsJSON.find(r => r.name.toLowerCase() === link.name.toLowerCase());
        if (!payloadMatch || payloadMatch.status !== link.status) {
            await run(
                "DELETE FROM relationships WHERE (person_id_1 = ? AND person_id_2 = ? AND type = ?) OR (person_id_1 = ? AND person_id_2 = ? AND type = ?)",
                [personId, link.id, type, link.id, personId, type]
            );
            // We'll re-add if the status changed in step 3.
        }
    }

    // 3. Add or Update links
    for (const relation of relationsJSON) {
        const name = relation.name;
        const status = relation.status;

        const existingLink = currentLinks.find(l => l.name.toLowerCase() === name.toLowerCase() && l.status === status);
        if (existingLink) continue; // Already exists correctly

        let target = await get("SELECT id, name, gender FROM people WHERE LOWER(name) = LOWER(?)", [name]);
        if (!target) {
            // Include default properties
            const res = await run(
                "INSERT INTO people (name, age, siblings, partners, additional_info, group_id, birth_date, gender, aliases, location) VALUES (?, 0, '[]', '[]', '', NULL, '', '', '', '')",
                [name]
            );
            target = { id: res.lastID, gender: '' };
        }

        if (target.id !== personId) {
            const oppositeStatus = getOppositeStatus(status, selfPerson ? selfPerson.gender : null);

            // Forward relation
            await run("INSERT OR REPLACE INTO relationships (person_id_1, person_id_2, type, status) VALUES (?, ?, ?, ?)", [personId, target.id, type, status]);
            // Reverse relation (Symmetric Logic)
            await run("INSERT OR REPLACE INTO relationships (person_id_1, person_id_2, type, status) VALUES (?, ?, ?, ?)", [target.id, personId, type, oppositeStatus]);
        }
    }
};

// Help function to update ALL strings of neighbors (needed when renaming or deleting)
const updateAllNeighbors = async (personId) => {
    const neighbors = await all("SELECT person_id_2 as id, type FROM relationships WHERE person_id_1 = ?", [personId]);
    for (const n of neighbors) {
        await updatePersonTextField(n.id, n.type);
    }
};

module.exports = {
    buildGroupPathAsync,
    syncRelationships,
    updateAllNeighbors,
    updatePersonTextField
};
