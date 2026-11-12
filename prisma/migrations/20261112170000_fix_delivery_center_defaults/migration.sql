-- Corrección de los valores por defecto del centro de reparto.
-- La migración anterior usó coordenadas preliminares; el casco central de
-- Ivirgarzama (Plaza Principal) está en -17.0315, -64.8615.
-- Es aditiva: no elimina datos ni columnas.

ALTER TABLE "BusinessProfile"
  ALTER COLUMN "deliveryCenterLatitude" SET DEFAULT -17.0315,
  ALTER COLUMN "deliveryCenterLongitude" SET DEFAULT -64.8615;

-- Corrige únicamente las filas que todavía conservan el valor preliminar.
UPDATE "BusinessProfile"
SET
  "deliveryCenterLatitude" = -17.0315,
  "deliveryCenterLongitude" = -64.8615
WHERE "deliveryCenterLatitude" = -16.9833
  AND "deliveryCenterLongitude" = -64.7667;
