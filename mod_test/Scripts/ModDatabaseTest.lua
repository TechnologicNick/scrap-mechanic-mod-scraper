print("ModDatabaseTest.lua")

dofile("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/ModDatabase.lua")

ModDatabaseTest = class()

function ModDatabaseTest.client_onInteract( self, character, state )
    ModDatabase.loadDescriptions()
end