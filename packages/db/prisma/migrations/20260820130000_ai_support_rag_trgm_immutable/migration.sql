DROP INDEX IF EXISTS idx_products_support_text_trgm;
DROP INDEX IF EXISTS idx_product_specifications_support_text_trgm;
DROP INDEX IF EXISTS idx_articles_support_text_trgm;

CREATE INDEX IF NOT EXISTS idx_products_support_text_trgm
  ON products USING gin ((coalesce(name,'') || ' ' || coalesce("shortDescription",'') || ' ' || coalesce(description,'')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_specifications_support_text_trgm
  ON product_specifications USING gin ((coalesce(key,'') || ' ' || coalesce(value,'')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_articles_support_text_trgm
  ON articles USING gin ((coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body::text,'')) gin_trgm_ops);
