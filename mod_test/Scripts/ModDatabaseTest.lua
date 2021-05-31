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

function ModDatabaseTest.printLoadedMods( self )
    ModDatabase.loadDescriptions()
    ModDatabase.loadShapesets()

    local msg = ""
    local count = 0

    for _, localId in ipairs(ModDatabase.getAllLoadedMods()) do
        msg = "\n  " .. ModDatabase.databases.descriptions[localId].name
        count = count + 1
    end

    msg = "Loaded mods (" .. tostring(count) .. ")" .. msg

    print(msg)
    sm.gui.chatMessage(msg)
end