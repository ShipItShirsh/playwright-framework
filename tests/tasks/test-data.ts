import catalog from '../data/catalog.json';

export interface CatalogProduct {
  name: string;
  price: number;
  slug: string;
}

/**
 * Test-data layer. In an enterprise suite this is where live lookups
 * (database / API discovery of valid companies, items, periods) live,
 * cached per worker. Here the "data layer" is a versioned catalog
 * fixture acting as the source of truth for parity checks — the
 * pattern is identical, the source is safe to publish.
 */
export function getCatalog(): CatalogProduct[] {
  return catalog as CatalogProduct[];
}

export function getProduct(name: string): CatalogProduct {
  const found = getCatalog().find((p) => p.name === name);
  if (!found) throw new Error(`Catalog has no product named "${name}" — missing data must fail, not skip`);
  return found;
}
