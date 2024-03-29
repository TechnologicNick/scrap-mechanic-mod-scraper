print("[ModDatabase] Initialising")

ModDatabase = {}

ModDatabase.databases = {}

_G.ModDatabaseCache = {}

local function countKeys(t)
    local count = 0
    for k, v in pairs(t) do
        count = count + 1
    end
    return count
end

function ModDatabase.loadDescriptions()
    print("[ModDatabase] Loading data/descriptions.json")

    ModDatabase.databases.descriptions = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/descriptions.json")

    print("[ModDatabase] Loaded descriptions of " .. tostring(countKeys(ModDatabase.databases.descriptions)) .. " mods")
end

function ModDatabase.loadShapesets()
    print("[ModDatabase] Loading data/shapesets.json")

    ModDatabase.databases.shapesets = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/shapesets.json")

    print("[ModDatabase] Loaded shapesets of " .. tostring(countKeys(ModDatabase.databases.shapesets)) .. " mods")
end

function ModDatabase.loadToolsets()
    print("[ModDatabase] Loading data/toolsets.json")

    ModDatabase.databases.toolsets = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/toolsets.json")

    print("[ModDatabase] Loaded toolsets of " .. tostring(countKeys(ModDatabase.databases.toolsets)) .. " mods")
end

function ModDatabase.loadHarvestablesets()
    print("[ModDatabase] Loading data/harvestablesets.json")

    ModDatabase.databases.harvestablesets = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/harvestablesets.json")

    print("[ModDatabase] Loaded harvestablesets of " .. tostring(countKeys(ModDatabase.databases.harvestablesets)) .. " mods")
end

function ModDatabase.loadKinematicsets()
    print("[ModDatabase] Loading data/kinematicsets.json")

    ModDatabase.databases.kinematicsets = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/kinematicsets.json")

    print("[ModDatabase] Loaded kinematicsets of " .. tostring(countKeys(ModDatabase.databases.kinematicsets)) .. " mods")
end

function ModDatabase.loadCharactersets()
    print("[ModDatabase] Loading data/charactersets.json")

    ModDatabase.databases.charactersets = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/charactersets.json")

    print("[ModDatabase] Loaded charactersets of " .. tostring(countKeys(ModDatabase.databases.charactersets)) .. " mods")
end

function ModDatabase.loadScriptableobjectsets()
    print("[ModDatabase] Loading data/scriptableobjectsets.json")

    ModDatabase.databases.scriptableobjectsets = sm.json.open("$CONTENT_40639a2c-bb9f-4d4f-b88c-41bfe264ffa8/Scripts/data/scriptableobjectsets.json")

    print("[ModDatabase] Loaded scriptableobjectsets of " .. tostring(countKeys(ModDatabase.databases.scriptableobjectsets)) .. " mods")
end



function ModDatabase.unloadDescriptions()
    ModDatabase.databases.descriptions = nil

    print("[ModDatabase] Unloaded data/descriptions.json")
end

function ModDatabase.unloadShapesets()
    ModDatabase.databases.shapesets = nil

    print("[ModDatabase] Unloaded data/shapesets.json")
end

function ModDatabase.unloadToolsets()
    ModDatabase.databases.toolsets = nil

    print("[ModDatabase] Unloaded data/toolsets.json")
end

function ModDatabase.unloadHarvestablesets()
    ModDatabase.databases.harvestablesets = nil

    print("[ModDatabase] Unloaded data/harvestablesets.json")
end

function ModDatabase.unloadKinematicsets()
    ModDatabase.databases.kinematicsets = nil

    print("[ModDatabase] Unloaded data/kinematicsets.json")
end

function ModDatabase.unloadCharactersets()
    ModDatabase.databases.charactersets = nil

    print("[ModDatabase] Unloaded data/charactersets.json")
end

function ModDatabase.unloadScriptableobjectsets()
    ModDatabase.databases.scriptableobjectsets = nil

    print("[ModDatabase] Unloaded data/scriptableobjectsets.json")
end



function ModDatabase.isModLoaded(localId)
    assert(ModDatabase.databases.shapesets, "Shapesets database is not loaded! Load it using ModDatabase.loadShapesets()")

    -- Mod does not exist in database, uncertain if loaded
    if not ModDatabase.databases.shapesets[localId] then
        return nil
    end

    local foundAnyLoaded = nil

    for shapeset, shapeUuids in pairs(ModDatabase.databases.shapesets[localId]) do
        for _, shapeUuid in ipairs(shapeUuids) do
            local uuid = sm.uuid.new(shapeUuid)

            -- Check if a shape is loaded
            if sm.item.isBlock(uuid) or sm.item.isPart(uuid) or sm.item.isJoint(uuid) then

                -- Some mods use UUIDs of the game and the previous check will always return true on them.
                -- This checks if the mod is installed by trying to read the part's shapeset file.
                if select(1, pcall(sm.json.fileExists, shapeset)) then
                    foundAnyLoaded = true
                else
                    return false
                end
            else
                return false
            end
        end
    end

    -- If the toolsets database is loaded, check for loaded tools as well
    if ModDatabase.databases.toolsets and ModDatabase.databases.toolsets[localId] then
        for toolset, toolUuids in pairs(ModDatabase.databases.toolsets[localId]) do
            for _, toolUuid in ipairs(toolUuids) do
                local uuid = sm.uuid.new(toolUuid)

                -- Check if a tool is loaded
                if sm.item.isTool(uuid) then

                    -- Some mods use UUIDs of the game and the previous check will always return true on them.
                    -- This checks if the mod is installed by trying to read the tool's toolset file.
                    if select(1, pcall(sm.json.fileExists, toolset)) then
                        foundAnyLoaded = true
                    else
                        return false
                    end
                else
                    return false
                end
            end
        end
    end

    -- Ensure all shapes and tools are loaded
    if foundAnyLoaded then
        return true
    end

    -- Mod doesn't have any shapes, uncertain if loaded
    return nil
end

function ModDatabase.getAllLoadedMods(ignoreCache)
    assert(ModDatabase.databases.shapesets, "Shapesets database is not loaded! Load it using ModDatabase.loadShapesets()")

    local loaded = {}

    if _G.ModDatabaseCache.loaded and (not ignoreCache) then
        return _G.ModDatabaseCache.loaded
    end

    for localId, shapesets in pairs(ModDatabase.databases.shapesets) do
        if ModDatabase.isModLoaded(localId) then
            table.insert(loaded, localId)
        end
    end

    _G.ModDatabaseCache.loaded = loaded
    return loaded
end



function ModDatabase.isModInstalled(localId)
    assert(ModDatabase.databases.descriptions, "Descriptions database is not loaded! Load it using ModDatabase.loadDescriptions()")

    -- Mod does not exist in database, uncertain if installed
    if not ModDatabase.databases.descriptions[localId] then
        return nil
    end

    -- Check if the mod's description file exists
    return select(1, pcall(sm.json.fileExists, "$CONTENT_" .. localId .. "/description.json"))
end

function ModDatabase.getAllInstalledMods(ignoreCache)
    assert(ModDatabase.databases.descriptions, "Descriptions database is not loaded! Load it using ModDatabase.loadDescriptions()")

    local installed = {}

    if _G.ModDatabaseCache.installed and (not ignoreCache) then
        return _G.ModDatabaseCache.installed
    end

    for localId, _ in pairs(ModDatabase.databases.descriptions) do
        if ModDatabase.isModInstalled(localId) then
            table.insert(installed, localId)
        end
    end
    _G.ModDatabaseCache.installed = installed
    return installed
end
