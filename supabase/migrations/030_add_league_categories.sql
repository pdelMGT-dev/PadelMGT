-- Multiple categories per league (e.g. Primera…Quinta) and each member's
-- category, so standings can be shown per category.
ALTER TABLE player_leagues ADD COLUMN IF NOT EXISTS categories jsonb;
ALTER TABLE league_members ADD COLUMN IF NOT EXISTS category text;
