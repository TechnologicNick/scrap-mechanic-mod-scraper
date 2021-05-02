const SteamUser = require("steam-user")

// const user = new SteamUser()

// user.logOn({
//     accountName: process.env.STEAM_USERNAME,
//     password: process.env.STEAM_PASSWORD,
// });

const superagent = require("superagent");

const FILE_URL = "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/"
const QUERY_FILES_URL = "https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/"

async function queryFiles(cursor = "*") {
    let query = `?key=${ process.env.STEAM_API_KEY }`;
    query += `&query_type=${ SteamUser.EPublishedFileQueryType.RankedByPublicationDate }`;
    query += `&cursor=${ encodeURIComponent(cursor) }`;
    query += `&numperpage=${ 100 }`;
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

    console.log("after");
    
    return details;
}

(async () => {
    const details = await queryAllFiles();

    console.log("Done:", details.length);
})();