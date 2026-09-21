CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Retrieval searches customer-facing catalog/CMS text only. These are additive
-- expression indexes; existing column semantics remain unchanged.
-- idx_products_name_trgm already exists from 20260727120000_pg_trgm_search.
CREATE INDEX IF NOT EXISTS idx_products_support_text_trgm
  ON products USING gin ((coalesce(name,'') || ' ' || coalesce("shortDescription",'') || ' ' || coalesce(description,'')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_specifications_support_text_trgm
  ON product_specifications USING gin ((coalesce(key,'') || ' ' || coalesce(value,'')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_articles_support_text_trgm
  ON articles USING gin ((coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body::text,'')) gin_trgm_ops);
