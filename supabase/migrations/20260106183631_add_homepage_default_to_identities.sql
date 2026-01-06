-- Function to create homepage infrastructure for new identities
-- Replicates the logic from createIdentity TypeScript function
-- Returns the permission token ID to be used as home_page
CREATE OR REPLACE FUNCTION create_identity_homepage()
RETURNS uuid AS $$
DECLARE
    new_entity_set_id uuid;
    new_entity_id uuid;
    new_permission_token_id uuid;
BEGIN
    -- Create a new entity set
    INSERT INTO entity_sets DEFAULT VALUES
    RETURNING id INTO new_entity_set_id;

    -- Create a root entity and add it to that entity set
    new_entity_id := gen_random_uuid();
    INSERT INTO entities (id, set)
    VALUES (new_entity_id, new_entity_set_id);

    -- Create a new permission token
    INSERT INTO permission_tokens (root_entity)
    VALUES (new_entity_id)
    RETURNING id INTO new_permission_token_id;

    -- Give the token full permissions on that entity set
    INSERT INTO permission_token_rights (token, entity_set, read, write, create_token, change_entity_set)
    VALUES (new_permission_token_id, new_entity_set_id, true, true, true, true);

    RETURN new_permission_token_id;
END;
$$ LANGUAGE plpgsql;

-- Set the function as the default value for home_page column
ALTER TABLE identities ALTER COLUMN home_page SET DEFAULT create_identity_homepage();
