/*
  # Add parent_id to crm_system_categories for tree hierarchy

  1. Modified Tables
    - `crm_system_categories`
      - Added `parent_id` (uuid, nullable, FK self-referencing with CASCADE delete)
      - This enables unlimited nesting: parent_id = NULL means root category,
        parent_id = <uuid> means child of that category

  2. Data Migration (backfill)
    - For each existing root category that already has items attached,
      create a child category named "General" and move items to it
    - This preserves all existing data while adapting to the new hierarchy

  3. Important Notes
    - No data is deleted
    - Existing categories become root-level categories
    - Items previously attached to root categories are moved to a "General" subcategory
    - The tree can be nested to any depth
*/

-- Add parent_id column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_system_categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE crm_system_categories
      ADD COLUMN parent_id uuid REFERENCES crm_system_categories(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_crm_system_categories_parent_id
  ON crm_system_categories(parent_id);

-- Backfill: for each root category that has items, create a "General" subcategory
-- and move those items into it
DO $$
DECLARE
  cat RECORD;
  new_sub_id uuid;
BEGIN
  FOR cat IN
    SELECT DISTINCT c.id, c.position
    FROM crm_system_categories c
    INNER JOIN crm_system_items i ON i.category_id = c.id
    WHERE c.parent_id IS NULL
  LOOP
    new_sub_id := gen_random_uuid();
    INSERT INTO crm_system_categories (id, name, position, parent_id)
    VALUES (new_sub_id, 'Général', 0, cat.id);

    UPDATE crm_system_items
    SET category_id = new_sub_id
    WHERE category_id = cat.id;
  END LOOP;
END $$;
