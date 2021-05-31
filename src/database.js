const fs = require("fs");
const JSONbig = require("json-bigint")({ storeAsString: true });

module.exports = class Database {

    data = {}

    constructor(filename) {
        this.filename = filename
    }

    async load() {
        if (!fs.existsSync(this.filename)) {
            console.log(`Database "${this.filename}" not found, creating...`);
            await this.save()
        }

        this.data = JSONbig.parse(await fs.promises.readFile(this.filename));
    }

    async save() {
        await fs.promises.writeFile(this.filename, JSONbig.stringify(this.data, null, '\t'));
    }


}