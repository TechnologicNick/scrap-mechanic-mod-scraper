const SteamUser = require("steam-user")

// const user = new SteamUser()

// user.logOn({
//     accountName: process.env.STEAM_USERNAME,
//     password: process.env.STEAM_PASSWORD,
// });

const superagent = require("superagent");

const FILE_URL = "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/"
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

(async () => {
    // const details = await queryAllFiles();
    const details = await queryNewFiles(2465640381);

    console.log("Done:", details);
})();