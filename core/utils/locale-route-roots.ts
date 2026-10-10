

export const ROOT_CANONICAL_FR = new Set<string>([
  
  
  
  
  
  
  'produit',     
  'blog',
  'recherche',
  'contact',
  'catalogue',
  'page',
  'avis',        
                 
  
  
  'inscription',
  'connexion',
  'panier',
  'commander',
  'paiement',
  'mon-compte',
  'mot-de-passe-oublie',
  'reinitialiser-mot-de-passe',
  'devis',
  'favoris',
  'evenements',
  'cartes-cadeaux',
  'rdv',
  'promotions',   
  'nouveautes',   
  
  
  'recherche-vehicule',
])

export const ROOT_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    produit:   'product',
    blog:      'blog',       
    recherche: 'search',
    contact:   'contact',    
    catalogue: 'catalog',
    page:      'page',       
    avis:      'reviews',
    
    inscription:                 'register',
    connexion:                   'login',
    panier:                      'cart',
    commander:                   'checkout',
    paiement:                    'payment',
    'mon-compte':                'my-account',
    'mot-de-passe-oublie':       'forgot-password',
    'reinitialiser-mot-de-passe':'reset-password',
    devis:                       'quote',
    favoris:                     'wishlist',
    evenements:                  'events',
    'cartes-cadeaux':            'gift-cards',
    rdv:                         'appointment',
    promotions:                  'prices-drop',
    nouveautes:                  'new-products',
    'recherche-vehicule':        'vehicle-search',
  },
  de: {
    produit:   'produkt',
    blog:      'blog',
    recherche: 'suche',
    contact:   'kontakt',
    catalogue: 'katalog',
    page:      'seite',
    avis:      'bewertungen',
    
    inscription:                 'registrieren',
    connexion:                   'anmelden',
    panier:                      'warenkorb',
    commander:                   'kasse',
    paiement:                    'zahlung',
    'mon-compte':                'mein-konto',
    'mot-de-passe-oublie':       'passwort-vergessen',
    'reinitialiser-mot-de-passe':'passwort-zuruecksetzen',
    devis:                       'angebot',
    favoris:                     'wunschliste',
    evenements:                  'veranstaltungen',
    'cartes-cadeaux':            'geschenkkarten',
    rdv:                         'termin',
    promotions:                  'angebote',
    nouveautes:                  'neuheiten',
    'recherche-vehicule':        'fahrzeugsuche',
  },
  es: {
    produit:   'producto',
    blog:      'blog',
    recherche: 'buscar',
    contact:   'contacto',
    catalogue: 'catalogo',
    page:      'pagina',
    avis:      'opiniones',
  },
  it: {
    produit:   'prodotto',
    blog:      'blog',
    recherche: 'ricerca',
    contact:   'contatto',
    catalogue: 'catalogo',
    page:      'pagina',
    avis:      'recensioni',
  },
}

export const ALL_POSSIBLE_LOCALES = Object.keys(ROOT_TRANSLATIONS)

const REVERSE_MAPS: Record<string, Record<string, string>> = {}
for (const [iso, map] of Object.entries(ROOT_TRANSLATIONS)) {
  const rev: Record<string, string> = {}
  for (const [fr, loc] of Object.entries(map)) rev[loc] = fr
  REVERSE_MAPS[iso] = rev
}

export function localizeRootSegment(segment: string, iso: string): string {
  if (!iso || iso === 'fr') return segment
  return ROOT_TRANSLATIONS[iso]?.[segment] ?? segment
}

export function canonicalizeRootSegment(segment: string, iso: string): string | null {
  if (!iso || iso === 'fr') return ROOT_CANONICAL_FR.has(segment) ? segment : null
  return REVERSE_MAPS[iso]?.[segment] ?? (ROOT_CANONICAL_FR.has(segment) ? segment : null)
}

export const STATEFUL_ROOT_FR = new Set<string>([
  'inscription',
  'connexion',
  'panier',
  'commander',
  'paiement',
  'mon-compte',
  'mot-de-passe-oublie',
  'reinitialiser-mot-de-passe',
  'devis',
  'favoris',
  'rdv',
  'recherche',
  'atelier-3d',   
                  
                  
])

export function buildStatefulDenyPaths(): string[] {
  const out = new Set<string>()
  for (const fr of STATEFUL_ROOT_FR) {
    out.add(`/${fr}`)
    out.add(`/${fr}/**`)
    for (const iso of ALL_POSSIBLE_LOCALES) {
      const loc = ROOT_TRANSLATIONS[iso]?.[fr] ?? fr
      out.add(`/${iso}/${loc}`)
      out.add(`/${iso}/${loc}/**`)
      
      out.add(`/${iso}/${fr}`)
      out.add(`/${iso}/${fr}/**`)
    }
  }
  return [...out].sort()
}

export function isStatefulPath(pathname: string): boolean {
  const segs = pathname.split('?')[0].split('/').filter(Boolean)
  if (segs.length === 0) return false
  let iso = 'fr'
  let first = segs[0]
  if (segs[0].length === 2 && ALL_POSSIBLE_LOCALES.includes(segs[0])) {
    iso = segs[0]
    first = segs[1] ?? ''
  }
  if (!first) return false
  const canonical = canonicalizeRootSegment(first, iso)
  return canonical !== null && STATEFUL_ROOT_FR.has(canonical)
}
