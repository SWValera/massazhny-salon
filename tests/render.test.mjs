import test from 'node:test';
import assert from 'node:assert/strict';
import pages from '../cloudflare/pages.json' with {type:'json'};
import defaults from '../data/defaults.json' with {type:'json'};
import {validateSettings,renderPage,routes} from '../cloudflare/render.js';
test('reject invalid prices, phone and route destinations',()=>{
 for(const data of [{...defaults,phone:'javascript:alert(1)'},{...defaults,latitude:NaN},{...defaults,twoGisId:'x'},{...defaults,prices:{...defaults.prices,klassicheskiy:-1}},{...defaults,prices:{...defaults.prices,klassicheskiy:1.5}}])assert.throws(()=>validateSettings(data));
 assert.equal(validateSettings({...defaults,phone:'+7 (705) 131-03-39'}).phone,defaults.phone);
});
test('render every page with independent prices and current contacts, including SEO and links',()=>{
 const data={...defaults,phone:'+77001234567',city:'Тестовый город',street:'Тестовая, 99',latitude:43.25,longitude:76.95,twoGisId:'',prices:Object.fromEntries(Object.keys(defaults.prices).map((key,index)=>[key,6100+index*100]))};
 for(const [path,template] of Object.entries(pages)){
  const html=renderPage(template,path,data,{SITE_URL:'https://example.test',INDEXABLE:'true'});
  assert.ok(!/@@|77051310339|Маркова|5 000|2 000/.test(html),path+' stale data');
  assert.ok(html.includes('data-site-phone="77001234567"'),path);
  assert.ok(html.includes('tel:+77001234567'),path);
  for(const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)){
   const schema=JSON.parse(match[1]);
   if(schema['@type']==='Service')assert.equal(schema.offers.priceSpecification.minPrice,data.prices[path.split('/')[2]]);
  }
  assert.ok(!html.includes('noindex')||path==='/404/',path);
 }
 const priceHtml=renderPage(pages['/ceny/'],'/ceny/',data,{});
 for(const price of Object.values(data.prices))assert.ok(priceHtml.includes(String(price).replace(/\B(?=(\d{3})+(?!\d))/g,' ')),String(price));
 assert.ok(routes(data).dgis.endsWith('76.95%2C43.25'));
});
test('escape stored text separately for HTML and JSON',()=>{
 const data={...defaults,street:'Тест & «Дом» "один"'};
 const html=renderPage(pages['/kontakty/'],'/kontakty/',data,{});
 assert.ok(html.includes('&amp;'));assert.ok(html.includes('&quot;один&quot;'));
 for(const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g))JSON.parse(match[1]);
 assert.ok(html.includes('noindex, nofollow'));
});
