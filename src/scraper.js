// @ts-check

const fs = require("fs");
const path = require("path");
const stripJsonComments = require("strip-json-comments");
const Database = require("./database");
const JSONbig = require("json-bigint")({ storeAsString: true });

module.exports = class Scraper {
    /** @type { Object.<number, string> } */
    idToUuid = {};
    /** @type { Object.<string, number> } */
    uuidToId = {};
    changes = {
        added: new Set(),
        updated: new Set()
    }
    blacklistedFileIds = [ 2504530003 /* Mod Database */ ];
    
    /**
     * @param {string} outDir The directory to store the scraped data in
     * @param {string} sourceDir The directory containing the downloaded mods
     */
    constructor(outDir, sourceDir) {
        this.outDir = outDir;
        this.sourceDir = sourceDir;

        if (!fs.existsSync(outDir)) {
            console.log("Scraper output directory not found, creating...");
            fs.mkdirSync(outDir);
        }

        this.dbDescriptions = new Database(path.join(this.outDir, "descriptions.json"));
        this.dbShapesets = new Database(path.join(this.outDir, "shapesets.json"));
        this.dbToolsets = new Database(path.join(this.outDir, "toolsets.json"));
        this.dbHarvestablesets = new Database(path.join(this.outDir, "harvestablesets.json"));
        this.dbKinematicsets = new Database(path.join(this.outDir, "kinematicsets.json"));
        this.dbScriptableobjectsets = new Database(path.join(this.outDir, "scriptableobjectsets.json"));
        this.dbCharactersets = new Database(path.join(this.outDir, "charactersets.json"));
    }

    async getIdsToScrape() {
        const downloaded = await fs.promises.readdir(this.sourceDir);
        return downloaded.filter(id => !this.blacklistedFileIds.includes(parseInt(id)));
    }

    /**
     * @param {string | number} publishedfileid
     * @param {boolean} fatal
     */
    getLocalId(publishedfileid, fatal = false) {
        const localId = this.idToUuid[publishedfileid] // from description that just got scraped
            ?? Object.values(this.dbDescriptions.data).find(desc => desc.fileId == publishedfileid)?.localId; // from description in database

        if (!localId) {
            if (fatal) {
                throw new Error(`No localId found for mod with publishedfileid=${publishedfileid}`);
            } else {
                console.log(`[Error] No localId found for mod with publishedfileid=${publishedfileid}`);
            }
        }

        return localId;
    }

    /**
     * @param {Database} database
     * @param {string} publishedfileid
     * @param {string | number} localId
     * @param {any} newData
     * @param {string} name
     */
    async handlePossibleChange(database, publishedfileid, localId, newData, name) {
        // Changelog
        // Check if mod already has an entry
        if (database.data[localId]) {

            // Check if the shapesets changed
            if (JSONbig.stringify(database.data[localId]) !== JSONbig.stringify(newData)) {
                console.log(`[${publishedfileid}, ${localId}] Updated ${name}`, JSONbig.stringify(database.data[localId]), JSONbig.stringify(newData));

                this.changes.updated.add(publishedfileid);
            } else {
                console.log(`[${publishedfileid}, ${localId}] Did not update ${name}`);
            }

        } else {
            // Prevent adding new databases marking all mods as updated
            if (typeof newData === "object" ? Object.keys(newData).length > 0 : true) {
                console.log(`[${publishedfileid}, ${localId}] Added ${name}`);
    
                if (database === this.dbDescriptions) {
                    this.changes.added.add(publishedfileid); 
                } else {
                    this.changes.updated.add(publishedfileid);
                }
            }
        }

        database.data[localId] = newData;
    }

    async scrapeDescriptions(details) {
        await this.dbDescriptions.load();

        for (let publishedfileid of await this.getIdsToScrape()) {
            try {
                let full = path.join(this.sourceDir, publishedfileid);

                let desc = JSONbig.parse(
                    stripJsonComments(
                        await (await fs.promises.readFile(
                            path.join(full, "description.json")
                        )).toString()
                    )
                );
                const localId = desc.localId;
                const fileId = parseInt(publishedfileid);

                if (fileId !== desc.fileId) {
                    console.log("[Warning] Detected fileId mismatch, overwriting with publishedfileid", { publishedfileid: fileId, description: desc.fileId });
                    desc.fileId = fileId;
                }

                if (this.dbDescriptions.data[localId] && this.dbDescriptions.data[localId]?.fileId !== fileId) {
                    const existingFileId = this.dbDescriptions.data[localId].fileId;
                    const currentFileId = fileId;
                    console.log(`[Error] Duplicate localId ${localId}:`, { existingFileId, currentFileId });

                    const existingFileLifetimeSubscriptions = details.find(value => value.publishedfileid == existingFileId)?.lifetime_subscriptions ?? -1;
                    const currentFileLifetimeSubscriptions = details.find(value => value.publishedfileid == currentFileId)?.lifetime_subscriptions ?? -1;
                    const subscriptions = { existing: existingFileLifetimeSubscriptions, current: currentFileLifetimeSubscriptions };
                    if (existingFileLifetimeSubscriptions > currentFileLifetimeSubscriptions) {
                        console.log(`[Error] Existing file has more lifetime subscriptions, not using current file.`, subscriptions);
                        this.blacklistedFileIds.push(currentFileId);
                        continue;
                    } else {
                        console.log(`[Error] Current file has more lifetime subscriptions, replacing existing file with current file.`, subscriptions);
                        this.blacklistedFileIds.push(existingFileId);
                    }
                }

                this.idToUuid[publishedfileid] = localId;
                this.uuidToId[localId] = fileId

                this.handlePossibleChange(this.dbDescriptions, publishedfileid, localId, desc, "description");

            } catch (ex) {
                console.log(`[Error] Failed reading description.json of ${publishedfileid}:\n`, ex);
            }
        }

        await this.dbDescriptions.save();
    }

    /**
     * @param {string} contentPath
     * @param {string} publishedfileid
     * @param {string} localId
     */
    resolveContentPath(contentPath, publishedfileid, localId) {
        const modDir = path.join(this.sourceDir, publishedfileid);

        const resolved = contentPath
            .replace("$MOD_DATA", modDir)
            .replace("$CONTENT_DATA", modDir)
            .replace(`$CONTENT_${localId}`, modDir)

        if (resolved.startsWith("$")) {
            return null;
        }

        return resolved;
    }

    async scrapeShapesets() {
        await this.dbShapesets.load();

        for (const publishedfileid of await this.getIdsToScrape()) {
            try {
                const localId = this.getLocalId(publishedfileid, true);
                const description = this.dbDescriptions.data[localId];

                const shapesetFiles = {}
                const parseShapeset = async (filename) => {
                    try {
                        const shapeset = JSON.parse(
                            stripJsonComments(
                                await (await fs.promises.readFile(filename)).toString()
                            )
                        );

                        const shapeUuids = [];

                        for (const shape of [].concat(shapeset.partList ?? [], shapeset.blockList ?? [])) {
                            // @ts-ignore
                            shapeUuids.push(shape.uuid);
                        }

                        const modDir = path.join(this.sourceDir, publishedfileid);
                        const absolute = path.resolve(modDir, filename);
                        if (!path.isAbsolute(absolute)) {
                            throw new Error(`Unable to resolve path "${absolute}" to an absolute path`);
                        }

                        shapesetFiles[absolute.replace(modDir, `$CONTENT_${localId}`)] = shapeUuids;

                    } catch (ex) {
                        console.log(`[Error] Failed reading shapeset file "${filename}" of ${publishedfileid}:\n`, ex);
                    }
                }

                if (
                    !description
                    || !description.type
                    || description.type !== "Custom Game" // Using *.json is not allowed in Custom Games
                ) {
                    // Parse shapesets found in `$CONTENT_DATA/Objects/Database/ShapeSets/*.json`

                    const shapesets = path.join(this.sourceDir, publishedfileid, "Objects", "Database", "ShapeSets");
                    if (fs.existsSync(shapesets)){
                        for (const shapesetJson of (await fs.promises.readdir(shapesets)).filter(f => f.endsWith(".json"))) {
                            await parseShapeset(path.join(shapesets, shapesetJson))
                        }
                    } else {
                        console.log(`[Warning] ShapeSets directory not found for ${publishedfileid}`);
                    }

                }

                {
                    // Parse shapesets found in `$CONTENT_DATA/Objects/Database/shapesets.shapedb`

                    const shapedb = path.join(this.sourceDir, publishedfileid, "Objects", "Database", "shapesets.shapedb");
                    if (fs.existsSync(shapedb)){
                        const { shapeSetList } = JSON.parse(
                            stripJsonComments(
                                await (await fs.promises.readFile(shapedb)).toString()
                            )
                        );

                        if (shapeSetList) {
                            const shapesetJson = shapeSetList
                                .map(shapeset => this.resolveContentPath(shapeset, publishedfileid, localId))
                                .filter(shapeset => shapeset);

                            for (const shapeset of shapesetJson) {
                                await parseShapeset(shapeset)
                            }
                        } else {
                            console.log(`[Warning] shapesets.shapedb file has no "shapeSetList" key for ${publishedfileid}`);
                        }
                    } else {
                        if (description?.type === "Custom Game") {
                            console.log(`[Warning] shapesets.shapedb file not found for ${publishedfileid}`);
                        }
                    }
                }


                this.handlePossibleChange(this.dbShapesets, publishedfileid, localId, shapesetFiles, "shapesets");

            } catch (ex) {
                console.log(`[Error] Failed scraping shapesets of ${publishedfileid}\n`, ex);
            }
        }

        await this.dbShapesets.save();
    }

    /**
     * Scrape a generic database
     * @param {Database} database The database to save to
     * @param {string} dbPath The path to the database file (e.g. `Objects/Database/shape.shapedb`)
     * @param {(db: any) => string[]} getSetListFromDb The function that extracts the paths to the sets from the database
     * @param {(set: any) => string} getUuidsFromSet The function that extracts the UUIDs from a set
     * @param {string} setName The name of the set (e.g. `shapeset`)
     * @param {string} dbName The name of the database (e.g. `shape.shapedb`)
     * @param {boolean} customGameOnly Whether the database is only allowed in custom games
     */
    async scrapeDatabase(database, dbPath, getSetListFromDb, getUuidsFromSet, setName, dbName, customGameOnly = false) {
        await database.load();

        for (const publishedfileid of await this.getIdsToScrape()) {
            try {
                const localId = this.getLocalId(publishedfileid, true);
                const description = this.dbDescriptions.data[localId];

                if (customGameOnly && description?.type !== "Custom Game") {
                    continue;
                }

                const setFiles = {}
                const parseSet = async (filename) => {
                    try {
                        const sets = JSON.parse(
                            stripJsonComments(
                                (await fs.promises.readFile(filename)).toString()
                            )
                        );

                        const uuids = getUuidsFromSet(sets);

                        const modDir = path.join(this.sourceDir, publishedfileid);
                        const absolute = path.resolve(modDir, filename);
                        if (!path.isAbsolute(absolute)) {
                            throw new Error(`Unable to resolve path "${absolute}" to an absolute path`);
                        }

                        setFiles[absolute.replace(modDir, `$CONTENT_${localId}`)] = uuids;

                    } catch (ex) {
                        console.log(`[Error] Failed reading ${setName} file "${filename}" of ${publishedfileid}:\n`, ex);
                    }
                }

                {
                    // Parse sets found in `$CONTENT_DATA/${dbPath}`

                    const db = path.join(this.sourceDir, publishedfileid, dbPath);
                    if (fs.existsSync(db)){
                        const dbContent = JSON.parse(
                            stripJsonComments(
                                (await fs.promises.readFile(db)).toString()
                            )
                        );

                        const setPaths = getSetListFromDb(dbContent)
                            .map(set => this.resolveContentPath(set, publishedfileid, localId))
                            .filter(set => set);

                        for (const set of setPaths) {
                            await parseSet(set);
                        }
                    } else {
                        if (description?.type === "Custom Game") {
                            console.log(`[Warning] ${dbName} file not found for ${publishedfileid}`);
                        }
                    }
                }


                this.handlePossibleChange(database, publishedfileid, localId, setFiles, `${setName}s`);

            } catch (ex) {
                console.log(`[Error] Failed scraping ${setName}s of ${publishedfileid}\n`, ex);
            }
        }

        await database.save();
    }

    async scrapeToolsets() {
        await this.scrapeDatabase(
            this.dbToolsets,
            path.join("Tools", "Database", "toolsets.tooldb"),
            (db) => db.toolSetList,
            (toolset) => toolset.toolList.map(tool => tool.uuid),
            "toolset",
            "toolsets.tooldb",
        );
    }

    async scrapeHarvestablesets() {
        await this.scrapeDatabase(
            this.dbHarvestablesets,
            path.join("Harvestables", "Database", "harvestablesets.harvestabledb"),
            (db) => db.harvestableSetList.map(harvestableset => harvestableset.name),
            (harvestableset) => harvestableset.harvestableList.map(harvestable => harvestable.uuid),
            "harvestableset",
            "harvestablesets.harvestabledb",
            true,
        );
    }

    async scrapeKinematicsets() {
        await this.scrapeDatabase(
            this.dbKinematicsets,
            path.join("Kinematics", "Database", "kinematicsets.kinematicdb"),
            (db) => db.kinematicSetList.map(kinematicset => kinematicset.name),
            (kinematicset) => kinematicset.kinematicList.map(kinematic => kinematic.uuid),
            "kinematicset",
            "kinematicsets.kinematicdb",
            true,
        );
    }

    async scrapeScriptableobjectsets() {
        await this.scrapeDatabase(
            this.dbScriptableobjectsets,
            path.join("ScriptableObjects", "scriptableObjectSets.sobdb"),
            (db) => db.scriptableObjectSetList.map(sobset => sobset.scriptableObjectSet),
            (sobset) => sobset.scriptableObjectList.map(sob => sob.uuid),
            "scriptableobjectset",
            "scriptableObjectSets.sobdb",
            true,
        );
    }

    async scrapeCharactersets() {
        await this.scrapeDatabase(
            this.dbCharactersets,
            path.join("Characters", "Database", "charactersets.characterdb"),
            (db) => db.characterSetList,
            (characterset) => characterset.characters.map(character => character.uuid),
            "characterset",
            "charactersets.characterdb",
            true,
        );
    }

    createChangelog(details) {
        let obj = {
            added: Array.from(this.changes.added),
            updated: Array.from(this.changes.updated),
            changeCount: this.changes.added.size + this.changes.updated.size,
            messageMD: "",
            messageBB: ""
        }

        // Added mods
        if (obj.added.length > 0) {
            obj.messageMD += `## Added mods (${obj.added.length})\n`;

            obj.messageBB += `[h2]Added mods (${obj.added.length})[/h2]\n`;
            obj.messageBB += `[list]\n`;

            for (let id of obj.added) {
                let name = this.dbDescriptions.data[this.idToUuid[id]]?.name // from description that just got scraped
                    ?? details.find(det => det.publishedfileid === id)?.title // from getPublishedFileDetails
                    ?? "Error: Failed getting name";
                let url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${ id }`;

                obj.messageMD += `* ${ name } ([workshop](${url}))\n`
                obj.messageBB += `[*] ${ name } ([url=${ url }]workshop[/url])\n`
            }

            obj.messageBB += `[/list]\n`;
        }

        // Add spacer between Added mods and Updated mods
        if (obj.added.length > 0 && obj.updated.length > 0) {
            obj.messageMD += `\n`;
            obj.messageBB += `\n`;
        }

        // Updated mods
        if (obj.updated.length > 0) {
            obj.messageMD += `## Updated mods (${obj.updated.length})\n`;
            
            obj.messageBB += `[h2]Updated mods (${obj.updated.length})[/h2]\n`;
            obj.messageBB += `[list]\n`;

            for (let id of obj.updated) {
                let name = this.dbDescriptions.data[this.idToUuid[id]]?.name // from description that just got scraped
                    ?? Object.values(this.dbDescriptions.data).find(desc => desc.fileId === id)?.name // from description in database
                    ?? details.find(det => det.publishedfileid === id)?.title // from getPublishedFileDetails
                    ?? "Error: Failed getting name";
                let time_updated = details.find(det => det.publishedfileid === id)?.time_updated;
                let url = `https://steamcommunity.com/sharedfiles/filedetails/changelog/${ id }#${ time_updated || "" }`;

                obj.messageMD += `* ${ name } ([changelog](${ url }))\n`;
                obj.messageBB += `[*] ${ name } ([url=${ url }]changelog[/url])\n`
            }

            obj.messageBB += `[/list]\n`;
        }

        obj.messageMD = obj.messageMD.trim();
        obj.messageBB = obj.messageBB.trim();

        if (obj.changeCount === 0) {
            obj.messageMD = obj.messageBB = "No changes found";
        }

        return obj;
    }
}