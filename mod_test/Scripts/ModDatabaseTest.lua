print("ModDatabaseTest.lua")

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

    local loadedMods = ModDatabase.getAllLoadedMods()

    local msg = ""
    local count = 0

    for _, localId in ipairs(loadedMods) do
        -- Get the name of the mod found it's description.json
        msg = "\n  " .. ModDatabase.databases.descriptions[localId].name

        count = count + 1
    end

    msg = "Loaded mods (" .. tostring(count) .. ")" .. msg

    print(msg)
    sm.gui.chatMessage(msg)

    -- Make sure to unload the databases after you're done using them, they take up quite a bit of memory
    ModDatabase.loadDescriptions()
    ModDatabase.loadShapesets()
    
end