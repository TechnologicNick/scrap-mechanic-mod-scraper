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

async function queryFiles(cursor = "*", numberPerPage = 100) {
    let query = `?key=${ process.env.STEAM_API_KEY }`;
    query += `&query_type=${ SteamUser.EPublishedFileQueryType.RankedByPublicationDate }`;
    query += `&cursor=${ encodeURIComponent(cursor) }`;
    query += `&numperpage=${ numberPerPage }`;
    query += `&appid=${ 387990 }`;
    query += `&requiredtags[0]=${ "Blocks+and+Parts" }`;
    // query += `&ids_only[]=${ true }`;

    const response = await superagent.get(QUERY_FILES_URL + query);

    console.log(response.request.url);
    console.log(response.body.response);

    return response.body.response;
}

async function queryAllFiles() {
    let details = [];

    let data = await queryFiles();
    details.push(...data.publishedfiledetails);

    while(data.publishedfiledetails) {
        data = await queryFiles(data.next_cursor);

        if (data.publishedfiledetails) {
            details.push(...data.publishedfiledetails);
        }
    }

    return details.map(d => parseInt(d.publishedfileid));
}

async function queryNewFiles(until, numberPerPage = 5) {
    let details = [];

    let data = await queryFiles(undefined, numberPerPage);
    details.push(...data.publishedfiledetails.map(d => d.publishedfileid).filter(id => id > until));

    // Query more if all ids are newer
    if (details.length === data.publishedfiledetails.length) {
        while(data.publishedfiledetails) {
            data = await queryFiles(data.next_cursor, numberPerPage);
    
            if (!data.publishedfiledetails) {
                break;
            }

            let newIds = data.publishedfiledetails.map(d => d.publishedfileid).filter(id => id > until);
            details.push(...newIds);

            if (newIds.length < data.publishedfiledetails.length){
                break;
            }
        }
    }

    return details;
}

async function getPublishedFileDetails(ids) {

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
    return new Promise(async (resolve, reject) => {
        let params = [
            "+login", process.env.STEAM_USERNAME, process.env.STEAM_PASSWORD
        ];

        if (makeScript) {
            fs.promises.writeFile(
                "/usr/app/download_items.vdf",
                ids.map(id => `workshop_download_item 387990 ${id.toString()}`).join("\n"),
                { flag: "w" }    
            );

            params.push(...["+runscript", "/usr/app/download_items.vdf"]);
        } else {
            for (let id of ids) {
                params.push(...["+workshop_download_item", "387990", id.toString()]);
            }
        }


        params.push("+quit");

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

(async () => {
    // const details = await queryAllFiles();
    // const details = await queryNewFiles(2465640381);
    // const details = await getPublishedFileDetails([2465640381]);
    // const details = await downloadWorkshopItems([2465640381], true);

    let scraper = new Scraper("./mod/Scripts/data", "D:/Programma's/SteamCMD/Steamcmd/steamapps/workshop/content/387990");
    await scraper.scrapeDescriptions();
    await scraper.scrapeShapesets();

    console.log("Done");
})();