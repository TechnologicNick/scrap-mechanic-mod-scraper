![ModDatabase](/mod/preview.png)

# scrap-mechanic-mod-scraper
Scrapes the Steam Workshop for Scrap Mechanic mods and stores useful information. This information is stored in both the [repo](https://github.com/TechnologicNick/scrap-mechanic-mod-scraper/tree/master/mod/Scripts/data) and [workshop mod](https://steamcommunity.com/sharedfiles/filedetails/?id=2504530003).

## Usage
[Example mod](https://github.com/TechnologicNick/scrap-mechanic-mod-scraper/tree/master/mod_test)

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
    ModDatabase.loadToolsets() -- Enable detecting of loaded tool-only mods (optional)

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
    ModDatabase.unloadToolsets()

end
```

## API
```lua
-- Loading the databases
function ModDatabase.loadDescriptions() end
function ModDatabase.loadShapesets() end
function ModDatabase.loadToolsets() end
function ModDatabase.loadHarvestablesets() end
function ModDatabase.loadKinematicsets() end
function ModDatabase.loadCharactersets() end
function ModDatabase.loadScriptableobjectsets() end

-- Unloading the databases
function ModDatabase.unloadDescriptions() end
function ModDatabase.unloadShapesets() end
function ModDatabase.unloadToolsets() end
function ModDatabase.unloadHarvestablesets() end
function ModDatabase.unloadKinematicsets() end
function ModDatabase.unloadCharactersets() end
function ModDatabase.unloadScriptableobjectsets() end

-- Getting localIds of loaded mods
function ModDatabase.isModLoaded(localId) end
function ModDatabase.getAllLoadedMods() end

-- Getting localIds of installed mods
function ModDatabase.isModInstalled(localId) end
function ModDatabase.getAllInstalledMods() end
```

## Database formats
Loading a database stores all entries into a dictionary with the `localId` of a mod as key.

> **Note:** Due to `sm.json.open` crashing when it tries to load a 64 bit integer, all integers that require more than 32 bits are stored as strings. If your mod contains such an integer, you have to convert it back yourself.

### Descriptions
`ModDatabase.databases.descriptions[localId]` returns the `description.json` of a mod as a table.
```jsonc
{
    "dea81b36-44e2-4839-886d-d3dededb3fc6": {
        "creatorId": "76561197982032350",
        "description": "Four new hot wheels for your ride!",
        "fileId": 871146046,
        "localId": "dea81b36-44e2-4839-886d-d3dededb3fc6",
        "name": "Crazy Wheel Pack",
        "type": "Blocks and Parts"
    },
    "40938326-3d32-4d54-aaaf-92e6a359427e": {
        "creatorId": "76561197979016514",
        "description": "",
        "fileId": 873609632,
        "localId": "40938326-3d32-4d54-aaaf-92e6a359427e",
        "name": "Buttons And Switches Pack",
        "type": "Blocks and Parts"
    },
    /* ... */
}
```

### Shapesets
`ModDatabase.databases.shapesets[localId]` returns a dictionary with a shapesets file as key and an array of blocks and parts it contains as value. To gain additional information about a shape you can use `sm.json.open(shapeset)` to load the shapeset json straight from the mod.
```jsonc
{
    "dea81b36-44e2-4839-886d-d3dededb3fc6": { /* Crazy Wheel Pack */
        "$CONTENT_dea81b36-44e2-4839-886d-d3dededb3fc6/Objects/Database/ShapeSets/wheels.json": [
            "79ae85fe-e5b3-4a48-bd3a-97e2f8fd8d08",
            "f891a495-356e-4378-8b09-cad11c2887c1",
            "f055374c-6a32-429b-abd8-4e04cf139572",
            "f8d325a0-5fac-47f8-b6f8-bfe3f60c811d"
        ]
    },
    "40938326-3d32-4d54-aaaf-92e6a359427e": { /* Buttons And Switches Pack */
        "$CONTENT_40938326-3d32-4d54-aaaf-92e6a359427e/Objects/Database/ShapeSets/Buttons_and_switches.json": [
            "753d71cb-03d2-4be9-a54e-2e7f825ff694",
            "1f62da56-e77a-4301-91e6-fbf8abb56de9",
            "39962ff2-e50d-4bba-8d82-32fbfeb69053",
            "96f21deb-908f-4804-9be2-ed0c533e2541",
            "5518577c-3418-445a-969d-22680e3f14f7",
            "c3aa933b-5798-4cfc-975b-d9632137ff44",
            "e669d8b6-31c2-4ea2-a023-7587d81c82c6",
            "54cd1a35-a9a3-407f-bf7e-82f307740ad6"
        ]
    },
    /* ... */
}
```

## Testing
There's a test mod included in this repo. It is recommended to create a symbolic link from `./mod_test` to your mods folder.

Place the part and press the interact button. The output should look something like the following:
```
Loaded mods (1)
  WASD Converter
Installed mods (13)
  The Modpack Continuation
  WASD Converter
  The Mirror Mod
  MJM SciFi Mod
  Extremely Long Piston!
  Drivable Bathtub
  Camera Controls
  Electromagnets
  Wings
  Scrap Guard
  Engineer's Toolbox
  Player Emotes
  Buttons And Switches Pack
```
