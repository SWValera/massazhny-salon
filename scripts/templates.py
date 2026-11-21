"""Prepare request-time templates separately from the static offline preview."""
import re

def make_template(doc, path):
    # JSON is rendered separately so strings are escaped for JSON, never HTML.
    index = 0
    def schema(match):
        nonlocal index
        index += 1
        return '<script type="application/ld+json">@@SCHEMA_'+str(index)+'@@</script>'
    schemas = re.findall(r'<script type="application/ld\+json">(.*?)</script>', doc)
    doc = re.sub(r'<script type="application/ld\+json">.*?</script>', schema, doc)
    doc = re.sub(r'(<(?:span|strong) data-price="([a-z-]+)">)от 5 000 ₸', lambda m:m[1]+'от @@PRICE_'+m[2]+'@@ ₸', doc)
    if path.startswith('/massazh/') and path != '/massazh/':
        doc = doc.replace('5 000', '@@PRICE_'+path.strip('/').split('/')[-1]+'@@')
    doc = doc.replace('2 000', '@@PRICE_shugaring@@')
    # Full variants first, then short forms (also covers titles and descriptions).
    for text, token in [
        ('Алматы, ул. Маркова, 28','@@ADDRESS@@'),
        ('улица Маркова, 28','@@STREET@@'), ('улице Маркова, 28','@@STREET@@'),
        ('ул. Маркова, 28','@@STREET@@'), ('МАРКОВА, 28','@@STREET_UPPER@@'),
        ('Маркова, 28','@@STREET@@'), ('Маркова 28','@@STREET@@'),
        ('АЛМАТЫ','@@CITY_UPPER@@'), ('Алматы','@@CITY@@'),
        ('+7 705 131 03 39','@@PHONE_DISPLAY@@'), ('+77051310339','@@PHONE@@'),
        ('77051310339','@@PHONE_DIGITS@@')]:
        doc = doc.replace(text, token)
    doc = re.sub(r'href="https://yandex.kz/maps/[^\"]+"', 'href="@@YANDEX@@"', doc)
    doc = re.sub(r'href="https://2gis.kz/[^\"]+"', 'href="@@DGIS@@"', doc)
    # Worker owns indexing and canonical URL, independent of the preview build.
    doc = re.sub(r'<link rel="canonical"[^>]*>|<meta property="og:url"[^>]*>', '', doc)
    doc = re.sub(r'<meta name="robots"[^>]*>', '@@SEO@@', doc)
    return {'html':doc,'schemas':schemas}
