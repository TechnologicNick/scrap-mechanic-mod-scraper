![ModDatabase](/mod/preview.png)

# scrap-mechanic-mod-scraper
Scrapes the Steam Workshop for Scrap Mechanic mods and stores useful information. This information is stored in both the [repo](https://github.com/TechnologicNick/scrap-mechanic-mod-scraper/tree/master/mod/Scripts/data) and [workshop mod](https://steamcommunity.com/sharedfiles/filedetails/?id=2504530003).

## Usage

### Dependency
To use the mod database in your own mod you need to add it to your dependencies. This can be done in the `description.json` of your mod.

```json
{
   "description" : "A mod for testing the ModDatabase mod.",
   "localId" : "521cbf4e-8901-4741-b6a6-4aee2386339f",
   "name" : "ModDatabaseTest",
   "type" : "Blocks and Parts",
   "version" : 0,
   "dependencies" : [
      {
         "fileId": 2504530003,
         "localId": "40639a2c-bb9f-4d4f-b88c-41bfe264ffa8"
      }
   ]
}
```

### Script
To use the script you first have to load it by putting a `dofile` statement in the root of your script.
```lua
-- Load the library, does not load the databases
dofile("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/ModDatabase.lua")
```
You can then call the library's functions anywhere from any sandbox.
```lua
-- Everything works both server-side and client-side
function ModDatabaseTest.doDatabaseStuff( self )
    
    -- Load the databases
    ModDatabase.loadDescriptions()
    ModDatabase.loadShapesets()

    -- Getting all loaded mods
    local loadedMods = ModDatabase.getAllLoadedMods() -- Returns an array of localIds (UUIDs, strings)

    --[[
        WARNING: This is not recommended to do, as it will try to open a file for each mod, causing
        a long freeze. Also logs 2 lines for each mod not found, increasing it's size by about 500kB.
    ]]
    -- Getting all installed mods
    local installedMods = ModDatabase.getAllInstalledMods() -- Returns an array of localIds (UUIDs, strings)



    -- Do something with the localIds
    for _, localId in ipairs(loadedMods) do
    
        -- Get the name of the mod found it's description.json
        print( ModDatabase.databases.descriptions[localId].name )

    end



    -- Make sure to unload the databases after you're done using them, they take up quite a bit of memory
    ModDatabase.unloadDescriptions()
    ModDatabase.unloadShapesets()

end
```
