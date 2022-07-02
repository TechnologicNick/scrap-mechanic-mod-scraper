const fs = require("fs");
const path = require("path");
const stripJsonComments = require("strip-json-comments");
const Database = require("./database");
const JSONbig = require("json-bigint")({ storeAsString: true });

module.exports = class Scraper {
    idToUuid = {};
    changes = {
        added: new Set(),
        updated: new Set()
    }
    
    constructor(outDir, sourceDir) {
        this.outDir = outDir;
        this.sourceDir = sourceDir;

        if (!fs.existsSync(outDir)) {
            console.log("Scraper output directory not found, creating...");
            fs.mkdirSync(outDir);
        }

        this.dbDescriptions = new Database(path.join(this.outDir, "descriptions.json"));
        this.dbShapesets = new Database(path.join(this.outDir, "shapesets.json"));
    }

    async getIdsToScrape() {
        return await fs.promises.readdir(this.sourceDir);
    }

    getLocalId(publishedfileid, fatal = false) {
        const localId = this.idToUuid[publishedfileid] // from description that just got scraped
            ?? Object.values(this.dbDescriptions.data).find(desc => desc.fileId === publishedfileid)?.localId; // from description in database

        if (!localId) {
            if (fatal) {
                throw new Error(`No localId found for mod with publishedfileid=${publishedfileid}`);
            } else {
                console.log(`[Error] No localId found for mod with publishedfileid=${publishedfileid}`);
            }
        }

        return localId;
    }

    async handlePossibleChange(database, publishedfileid, localId, newData, name) {
        // Changelog
        // Check if mod already has an entry
        if (database.data[localId]) {

            // Check if the shapesets changed
            if (JSONbig.stringify(database.data[localId]) !== JSONbig.stringify(newData)) {
                console.log(`[${publishedfileid}] Updated ${name}`);

                this.changes.updated.add(publishedfileid);
            } else {
                console.log(`[${publishedfileid}] Did not update ${name}`);
            }

        } else {
            console.log(`[${publishedfileid}] Added ${name}`);

            this.changes.added.add(publishedfileid); 
        }

        database.data[localId] = newData;
    }

    async scrapeDescriptions() {
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

                this.idToUuid[publishedfileid] = localId;

                this.handlePossibleChange(this.dbDescriptions, publishedfileid, localId, desc, "description");

            } catch (ex) {
                console.error(`Error reading description.json of ${publishedfileid}:\n`, ex);
            }
        }

        await this.dbDescriptions.save();
    }

    async scrapeShapesets() {
        await this.dbShapesets.load();

        for (let publishedfileid of await this.getIdsToScrape()) {
            try {
                let localId = this.getLocalId(publishedfileid, false);

                let shapesets = path.join(this.sourceDir, publishedfileid, "Objects", "Database", "ShapeSets");

                let shapesetFiles = {}

                if (fs.existsSync(shapesets)){
                    for (let shapesetJson of (await fs.promises.readdir(shapesets)).filter(f => f.endsWith(".json"))) {
                        try {
                            let shapeset = JSON.parse(
                                stripJsonComments(
                                    await (await fs.promises.readFile(
                                        path.join(shapesets, shapesetJson)
                                    )).toString()
                                )
                            );
    
                            let shapeUuids = [];
    
                            for (let shape of [].concat(shapeset.partList ?? [], shapeset.blockList ?? [])) {
                                shapeUuids.push(shape.uuid);
                            }
    
                            shapesetFiles[`$CONTENT_${localId}/Objects/Database/ShapeSets/${shapesetJson}`] = shapeUuids;
    
    
                        } catch (ex) {
                            console.error(`Error reading shapeset file "${shapesetJson}" of ${publishedfileid}:\n`, ex);
                        }
                    }
                } else {
                    console.warn(`ShapeSets directory not found for ${publishedfileid}`);
                }


                this.handlePossibleChange(this.dbShapesets, publishedfileid, localId, shapesetFiles, "shapesets");

            } catch (ex) {
                console.error(`Error reading shapesets of ${publishedfileid}\n`, ex);
            }
        }

        await this.dbShapesets.save();
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