print("ModDatabaseTest.lua")

-- Load the library, does not load the databases
dofile("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/ModDatabase.lua")

ModDatabaseTest = class()

function ModDatabaseTest.client_onInteract( self, character, state )
    if not state then return end

    self:printLoadedMods()
end

function ModDatabaseTest.server_onRefresh( self )
    self:printLoadedMods()
end

-- Everything works both server-side and client-side
function ModDatabaseTest.printLoadedMods( self )
    
    -- Load the databases
    ModDatabase.loadDescriptions()
    ModDatabase.loadShapesets()

    -- Getting all loaded mods
    local loadedMods = ModDatabase.getAllLoadedMods()

    --[[
        WARNING: This is not recommended to do, as it will try to open a file for each mod, causing
        a long freeze.
    ]]
    -- Getting all installed mods
    local installedMods = ModDatabase.getAllInstalledMods()

    self:printMods(loadedMods, "Loaded mods (%d)")
    self:printMods(installedMods, "Installed mods (%d)")

    -- Make sure to unload the databases after you're done using them, they take up quite a bit of memory
    ModDatabase.unloadDescriptions()
    ModDatabase.unloadShapesets()

end

function ModDatabaseTest.printMods( self, localIds, messagePrefix )
    local msg = ""
    local count = 0

    for _, localId in ipairs(localIds) do
        -- Get the name of the mod found it's description.json
        msg = msg .. "\n  " .. ModDatabase.databases.descriptions[localId].name

        count = count + 1
    end

    msg = messagePrefix:format(count) .. msg

    print(msg)
    sm.gui.chatMessage(msg)
end
