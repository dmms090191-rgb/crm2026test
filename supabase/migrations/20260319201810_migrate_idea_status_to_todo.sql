/*
  # Migrate 'idea' status to 'todo' in crm_ideas

  1. Changes
    - Updates all rows in `crm_ideas` where `status` = 'idea' to `status` = 'todo'
    - Sets the default value of the `status` column to 'todo'
  
  2. Reason
    - The 'idea' status is being removed
    - Only 'todo' and 'done' statuses remain
    - Existing 'idea' entries are automatically moved to 'todo'
*/

UPDATE crm_ideas SET status = 'todo' WHERE status = 'idea';

ALTER TABLE crm_ideas ALTER COLUMN status SET DEFAULT 'todo';
