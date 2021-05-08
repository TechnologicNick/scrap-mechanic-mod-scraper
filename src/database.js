const fs = require("fs");

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

        this.data = JSON.parse(await fs.promises.readFile(this.filename));
    }

    async save() {
        await fs.promises.writeFile(this.filename, JSON.stringify(this.data, null, '\t'));
    }


}