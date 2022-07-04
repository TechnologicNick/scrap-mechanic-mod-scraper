const SteamUser = require("steam-user")

// const user = new SteamUser()

// user.logOn({
//     accountName: process.env.STEAM_USERNAME,
//     password: process.env.STEAM_PASSWORD,
// });

const superagent = require("superagent");
const cp = require("child_process");
const fs = require("fs");

const Scraper = require("./scraper");

const GET_PUBLISHED_FILE_DETAILS_URL = "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/"
const QUERY_FILES_URL = "https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/"

async function queryFiles(tag, cursor = "*", numberPerPage = 100) {
    let query = `?key=${ process.env.STEAM_API_KEY }`;
    query += `&query_type=${ SteamUser.EPublishedFileQueryType.RankedByPublicationDate }`;
    query += `&cursor=${ encodeURIComponent(cursor) }`;
    query += `&numperpage=${ numberPerPage }`;
    query += `&appid=${ 387990 }`;
    query += `&requiredtags[0]=${ tag }`;
    // query += `&ids_only[]=${ true }`;

    const response = await superagent.get(QUERY_FILES_URL + query);

    // console.log(response.request.url);
    console.log(response.body.response);

    return response.body.response;
}

async function queryAllFiles() {
    let details = [];

    for (let tag of ["Blocks+and+Parts", "Custom+Game"]) {
        let data = await queryFiles(tag);
        details.push(...data.publishedfiledetails);
    
        while(data.publishedfiledetails) {
            data = await queryFiles(tag, data.next_cursor);
    
            if (data.publishedfiledetails) {
                details.push(...data.publishedfiledetails);
            }
        }
    }

    return details.map(d => parseInt(d.publishedfileid));
}

async function getPublishedFileDetails(ids) {
    if (ids.length === 0) {
        return { publishedfiledetails: [] };
    }

    let formData = {
        key: process.env.STEAM_API_KEY,
        itemcount: ids.length
    }
    ids.forEach((id, i) => {
        formData[`publishedfileids[${ i }]`] = id;
    });
    

    let request = superagent.post(GET_PUBLISHED_FILE_DETAILS_URL).type("form")
        .field("key", process.env.STEAM_API_KEY)
        .field("itemcount", ids.length);

    ids.forEach((id, i) => {
        request.field(`publishedfileids[${ i }]`, id);
    });

    let response = await request;

    return response.body.response;
}

function downloadWorkshopItems(ids, makeScript = false) {
    console.log("Downloading ids", ids.join(", "));

    return new Promise(async (resolve, reject) => {
        let params = [
            "+login", process.env.STEAM_USERNAME, process.env.STEAM_PASSWORD
        ];

        if (makeScript) {
            fs.promises.writeFile(
                "/home/steam/app/download_items.vdf",
                ids.map(id => `workshop_download_item 387990 ${id.toString()}`).join("\n"),
                { flag: "w" }    
            );

            params.push(...["+runscript", "/home/steam/app/download_items.vdf"]);
        } else {
            for (let id of ids) {
                params.push(...["+workshop_download_item", "387990", id.toString()]);
            }
        }


        params.push("+quit");

        console.log("Params:", params);



        const idsLeft = [...ids];
        const ls = cp.spawn("/home/steam/steamcmd/steamcmd.sh", params, { timeout: 5 * 60000 });
    
        ls.stdout.on("data", function (data) {
            console.log(`[pid=${ls.pid}] stdout: ${data.toString()}`);

            const downloadedId = (/Success. Downloaded item (?<id>\d+) to/g).exec(data.toString())?.groups?.id;
            if (downloadedId) {
                const foundIndex = idsLeft.findIndex(failedId => failedId == downloadedId);
                idsLeft.splice(foundIndex, 1);
                console.log(`[pid=${ls.pid}] Detected successful download of ${downloadedId}. Amount left: ${idsLeft.length}`);
            }

            if (data.toString().match(/ERROR! Download item (?<id>\d+) failed \(I\/O Operation Failed\)/g)) {
                console.log(`[pid=${ls.pid}] Detected I/O Operation Failed. Stopping downloading to prevent infinite loop. Amount left: ${idsLeft.length}`);
                ls.kill();

                reject({
                    exitcode: 1,
                    failedIds: idsLeft,
                });
            }

            if (data.toString().match(/ERROR! Not logged on./g)) {
                console.log(`[pid=${ls.pid}] Detected not logged on. Killing process to prevent script restart. Amount left: ${idsLeft.length}`);
                ls.kill();

                resolve({
                    exitcode: 1,
                    failedIds: idsLeft,
                });
            }
        });
    
        ls.stderr.on("data", function (data) {
            console.log(`[pid=${ls.pid}] stderr: ${data.toString()}`);
        });
    
        ls.on("exit", function (code) {
            console.log(`[pid=${ls.pid}] child process exited with code ${code?.toString()}`);
            console.log(`[pid=${ls.pid}] Resolving with`, idsLeft.length);
            resolve({
                exitcode: code,
                failedIds: idsLeft,
            });
        });
    });
}

async function updateMod(appid, publishedfileid, contentfolder, changenote) {
    let vdf = "/home/steam/app/upload_workshop.vdf";

    await fs.promises.writeFile(vdf, `"workshopitem"
{
    "appid"            "${appid}"
    "publishedfileid"  "${publishedfileid}"
    "contentfolder"    "${contentfolder}"
    "changenote"       "${changenote}"
}`);

    return await new Promise(async (resolve, reject) => {
        let params = [
            "+login", process.env.STEAM_USERNAME, process.env.STEAM_PASSWORD,
            "+workshop_build_item", vdf,
            "+quit"
        ];

        console.log("Params:", params);



        let ls = cp.spawn("/home/steam/steamcmd/steamcmd.sh", params);
    
        ls.stdout.on("data", function (data) {
            console.log("stdout: " + data.toString());
        });
    
        ls.stderr.on("data", function (data) {
            console.log("stderr: " + data.toString());
        });
    
        ls.on("exit", function (code) {
            console.log("child process exited with code " + code.toString());
            resolve(code);
        });
    });
}

function getSettings() {
    return {
        SKIP_UPDATE: process.env.SKIP_UPDATE === "true",
        SKIP_DOWNLOAD: process.env.SKIP_DOWNLOAD === "true",
        SKIP_QUERY: process.env.SKIP_QUERY === "true",
        SKIP_PRESENT: process.env.SKIP_PRESENT === "true",
        MANUAL_DOWNLOAD: process.env.MANUAL_DOWNLOAD?.split(/[^\d+]/g)?.filter(id => id.length > 0).map(id => parseInt(id)) ?? [],
        DOWNLOAD_SINCE: process.env.DOWNLOAD_SINCE ? parseInt(process.env.DOWNLOAD_SINCE) : null,
    }
}

(async () => {
    const settings = getSettings();
    console.log({ settings });

    const unixNow = Math.floor(new Date().getTime() / 1000);
    const lastUpdated = JSON.parse(await fs.promises.readFile("./mod/Scripts/data/last_update.json"));
    
    let queriedFiles = [];
    if (settings.SKIP_QUERY) {
        console.warn("Found SKIP_QUERY=true environment variable, skipping querying all files");
    } else {
        queriedFiles = await queryAllFiles();
    }

    const request = await getPublishedFileDetails(Array.from(new Set([...queriedFiles, ...settings.MANUAL_DOWNLOAD])));
    console.log({ request });
    let ids = request.publishedfiledetails.filter(item => {
        if (settings.MANUAL_DOWNLOAD.includes(parseInt(item.publishedfileid))) {
            return true;
        }

        // Don't download self
        if (item.publishedfileid == 2504530003) {
            return false;
        }

        if (settings.DOWNLOAD_SINCE) {
            return item.time_updated >= settings.DOWNLOAD_SINCE;
        }

        return (
            !lastUpdated.items?.[item.publishedfileid]
            || item.time_updated > lastUpdated.items[item.publishedfileid]
        );
    }).map(item => item.publishedfileid);

    const presentIds = await fs.promises.readdir("/home/steam/Steam/steamapps/workshop/content/387990");
    if (settings.SKIP_PRESENT) {
        console.warn("Found SKIP_PRESENT=true environment variable, skipping downloading present", presentIds);

        ids = ids.filter(id => !presentIds.includes(id));
    }
    
    if (ids.length > 0) {
        if (settings.SKIP_DOWNLOAD) {
            console.warn("Found SKIP_DOWNLOAD=true environment variable, skipping downloading", ids);
        } else {
            let idsLeft = ids;

            while (idsLeft.length > 0) {
                const { exitcode, failedIds } = await downloadWorkshopItems(idsLeft, true);

                if (failedIds.length > 0) {
                    console.log("Failed to download some items, retrying to download", failedIds);
                }
                
                idsLeft = failedIds;
            }
        }
    }
    
    const scraper = new Scraper("./mod/Scripts/data", "/home/steam/Steam/steamapps/workshop/content/387990");

    await scraper.scrapeDescriptions(request.publishedfiledetails);
    await scraper.scrapeShapesets();

    let changelog = scraper.createChangelog(request.publishedfiledetails);

    console.log(changelog);
    await fs.promises.writeFile("/home/steam/app/changelog.json", JSON.stringify(changelog));

    if (changelog.changeCount > 0) {
        console.log("Changes found, updating workshop mod...");

        for (const presentId of presentIds) {
            lastUpdated.items ??= {};
            lastUpdated.items[presentId] = request.publishedfiledetails.find(d => d.publishedfileid == presentId)?.time_updated ?? null;
        }

        await fs.promises.writeFile("./mod/Scripts/data/last_update.json", JSON.stringify(
            {
                unix_timestamp: unixNow,
                items: lastUpdated.items,
            },
            null, "\t"
        ));

        if (settings.SKIP_UPDATE) {
            console.warn("Found SKIP_UPDATE=true environment variable, ignoring update request");
        } else {
            await updateMod(387990, 2504530003, "/home/steam/app/mod", changelog.messageBB);
        }
    } else {
        console.log("No changes found, leaving workshop mod as it is");
    }

    console.log("Done");
})();