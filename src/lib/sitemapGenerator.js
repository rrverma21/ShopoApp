export const routes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/about', priority: '0.8', changefreq: 'monthly' },
  { path: '/terms-of-service', priority: '0.5', changefreq: 'yearly' },
  { path: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
  { path: '/join-us', priority: '0.7', changefreq: 'monthly' },
  { path: '/login', priority: '0.6', changefreq: 'monthly' },
  { path: '/signup', priority: '0.7', changefreq: 'monthly' },
  { path: '/products', priority: '0.9', changefreq: 'daily' },
  { path: '/cart', priority: '0.4', changefreq: 'always' },
  { path: '/local-shops', priority: '0.8', changefreq: 'weekly' },
  { path: '/bulk-order', priority: '0.7', changefreq: 'monthly' },
  { path: '/membership', priority: '0.8', changefreq: 'monthly' },
  { path: '/delivery/book', priority: '0.8', changefreq: 'always' },
  { path: '/rider-signup', priority: '0.7', changefreq: 'monthly' },
  { path: '/retailer-signup', priority: '0.7', changefreq: 'monthly' },
];

export const generateSitemapXML = (domain = 'https://b2bnexus.in') => {
  const currentDate = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  routes.forEach(route => {
    xml += `
  <url>
    <loc>${domain}${route.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  });

  xml += `
</urlset>`;

  return xml;
};