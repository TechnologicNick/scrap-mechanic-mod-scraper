print("[ModDatabase] Initialising")

ModDatabase = {}

ModDatabase.databases = {}

function ModDatabase.loadDescriptions()
    print("[ModDatabase] Loading data/descriptions.json")

    ModDatabase.databases.descriptions = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/descriptions.json")

    local count = 0
    for k, v in pairs(ModDatabase.databases.descriptions) do
        count = count + 1
    end

    print("[ModDatabase] Loaded descriptions of " .. tostring(count) .. " mods")
end

function ModDatabase.loadShapesets()
    print("[ModDatabase] Loading data/shapesets.json")

    ModDatabase.databases.shapesets = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/shapesets.json")

    local count = 0
    for k, v in pairs(ModDatabase.databases.shapesets) do
        count = count + 1
    end

    print("[ModDatabase] Loaded shapesets of " .. tostring(count) .. " mods")
end

function ModDatabase.unloadDescriptions()
    ModDatabase.databases.descriptions = nil
    
    print("[ModDatabase] Unloaded data/descriptions.json")
end

function ModDatabase.unloadShapesets()
    ModDatabase.databases.shapesets = nil
    
    print("[ModDatabase] Unloaded data/shapesets.json")
end



function ModDatabase.isModLoaded(localId)
    assert(ModDatabase.databases.shapesets, "Shapesets database is not loaded! Load it using ModDatabase.loadShapesets()")

    -- Mod does not exist in database, uncertain if loaded
    if not ModDatabase.databases.shapesets[localId] then
        return nil
    end

    for shapeset, shapeUuids in pairs(ModDatabase.databases.shapesets[localId]) do
        if shapeUuids[1] then
            local uuid = sm.uuid.new(shapeUuids[1])

            -- Check if a shape is loaded
            if sm.item.isBlock(uuid) or sm.item.isPart(uuid) then

                -- Some mods use UUIDs of the game and the previous check will always return true on them.
                -- This checks if the mod is installed by trying to read the part's shapeset file.
                return select(1, pcall(sm.json.open, shapeset))
            else
                return false
            end
        end
    end

    -- Mod doesn't have any shapes, uncertain if loaded
    return nil
end

function ModDatabase.getAllLoadedMods()
    assert(ModDatabase.databases.shapesets, "Shapesets database is not loaded! Load it using ModDatabase.loadShapesets()")

    local loaded = {}

    for localId, shapesets in pairs(ModDatabase.databases.shapesets) do
        if ModDatabase.isModLoaded(localId) then
            table.insert(loaded, localId)
        end
    end

    return loaded
end



function ModDatabase.isModInstalled(localId)
    assert(ModDatabase.databases.shapesets, "Shapesets database is not loaded! Load it using ModDatabase.loadShapesets()")

    -- Mod does not exist in database, uncertain if installed
    if not ModDatabase.databases.shapesets[localId] then
        return nil
    end

    for shapeset, shapeUuids in pairs(ModDatabase.databases.shapesets[localId]) do
        return select(1, pcall(sm.json.open, shapeset))
    end

    -- Mod doesn't have any shapesets, uncertain if loaded
    return nil
end

function ModDatabase.getAllInstalledMods()
    assert(ModDatabase.databases.shapesets, "Shapesets database is not loaded! Load it using ModDatabase.loadShapesets()")

    local installed = {}

    for localId, shapesets in pairs(ModDatabase.databases.shapesets) do
        if ModDatabase.isModInstalled(localId) then
            table.insert(installed, localId)
        end
    end

    return installed
end
