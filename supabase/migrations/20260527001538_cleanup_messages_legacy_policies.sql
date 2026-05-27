/*
  # Clean up remaining legacy policies on messages table

  1. Changes
    - Drop 4 old policies with permissive `true` or `auth.uid() IS NOT NULL` checks
    - Keep only the new "SA only can view messages" policy

  2. Security
    - The messages table (0 rows, legacy) is now fully locked to super_admin SELECT only
*/

DROP POLICY IF EXISTS "Authenticated users can read messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can delete messages" ON messages;
