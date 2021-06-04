const fs = require("fs");
const path = require("path");
const stripJsonComments = require("strip-json-comments");
const Database = require("./database");
const JSONbig = require("json-bigint")({ storeAsString: true });

module.exports = class Scraper {
    idToUuid = {};
    changelog = {
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

    async scrapeDescriptions() {
        await this.dbDescriptions.load();

        for (let id of await fs.promises.readdir(this.sourceDir)) {
            try {
                let full = path.join(this.sourceDir, id);

                let desc = JSONbig.parse(
                    stripJsonComments(
                        await (await fs.promises.readFile(
                            path.join(full, "description.json")
                        )).toString()
                    )
                );

                this.idToUuid[id] = desc.localId;

                // Changelog
                // Check if mod already has an entry
                if (this.dbDescriptions.data[desc.localId]) {

                    // Check if the description changed
                    if (JSONbig.stringify(this.dbDescriptions.data[desc.localId]) !== JSONbig.stringify(desc)) {
                        console.log(`[${id}] Updated description`);

                        this.changelog.updated.add(id);
                    } else {
                        console.log(`[${id}] Did not update description`);
                    }

                } else {
                    console.log(`[${id}] Added description`);

                    this.changelog.added.add(id); 
                }

                this.dbDescriptions.data[desc.localId] = desc;

            } catch (ex) {
                console.error(`Error reading description.json of ${id}:\n`, ex);
            }
        }

        await this.dbDescriptions.save();
    }

    async scrapeShapesets() {
        await this.dbShapesets.load();

        for (let id of await fs.promises.readdir(this.sourceDir)) {
            try {
                let shapesets = path.join(this.sourceDir, id, "Objects", "Database", "ShapeSets");

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
    
                            shapesetFiles[`$CONTENT_${this.idToUuid[id]}/Objects/Database/ShapeSets/${shapesetJson}`] = shapeUuids;
    
    
                        } catch (ex) {
                            console.error(`Error reading shapeset file "${shapesetJson}" of ${id}:\n`, ex);
                        }
                    }
                } else {
                    console.warn(`ShapeSets directory not found for ${id}`);
                }


                // Changelog
                // Check if mod already has an entry
                if (this.dbShapesets.data[this.idToUuid[id]]) {

                    // Check if the shapesets changed
                    if (JSONbig.stringify(this.dbShapesets.data[this.idToUuid[id]]) !== JSONbig.stringify(shapesetFiles)) {
                        console.log(`[${id}] Updated shapesets`);

                        this.changelog.updated.add(id);
                    } else {
                        console.log(`[${id}] Did not update shapesets`);
                    }

                } else {
                    console.log(`[${id}] Added shapesets`);

                    this.changelog.added.add(id); 
                }

                this.dbShapesets.data[this.idToUuid[id]] = shapesetFiles;

            } catch (ex) {
                console.error(`Error reading shapesets of ${id}\n`, ex);
            }
        }

        await this.dbShapesets.save();
    }
}