-- League branding: logo/banner shown on the league page, the public /l/[code]
-- page, the /leagues directory, and the Juego Rápido schedule card.
ALTER TABLE player_leagues
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text;
