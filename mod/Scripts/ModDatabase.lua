print("[ModDatabase] Initialising")

ModDatabase = {}

ModDatabase.databases = {}

function ModDatabase.loadDescriptions()
    print("[ModDatabase] Loading data/descriptions.json")

    -- This file must not include 64 bit numbers. Trying to load a file with 64 bit numbers crashes the lua call.
    ModDatabase.databases.descriptions = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/descriptions.json")

    print("[ModDatabase] Loaded " .. tostring(#ModDatabase.databases.descriptions) .. " mod descriptions")
end

ModDatabase.loadDescriptions()
print("ModDatabase: ", ModDatabase)