/*
  # Update default page_key value

  1. Modified Tables
    - `content_blocks`
      - Changed default value of `page_key` from 'page-accueil' to 'page-d-accueil'
        to match the slug generated from "Page d'accueil"
*/

ALTER TABLE content_blocks ALTER COLUMN page_key SET DEFAULT 'page-d-accueil';
