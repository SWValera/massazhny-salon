import services from '../data/services.json' with {type:'json'};
export {services};
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function phoneDisplay(phone) {
  return phone.length===12 && phone.startsWith('+7') ? `${phone.slice(0,2)} ${phone.slice(2,5)} ${phone.slice(5,8)} ${phone.slice(8,10)} ${phone.slice(10)}` : phone;
}
export function routes(data) {
  const {latitude:lat,longitude:lon,twoGisId:id}=data;
  return {
    yandex:`https://yandex.kz/maps/?mode=routes&rtext=~${lat}%2C${lon}&rtt=auto&ll=${lon}%2C${lat}&z=16`,
    dgis:`https://2gis.kz/directions/points/%7C${lon}%2C${lat}${id ? '%3B'+id : ''}`
  };
}
export function validateSettings(input) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Проверьте данные формы.');
  const text=(key,min,max)=>{
    if(typeof input[key]!=='string') throw new Error('Заполните адрес и телефон.');
    const value=input[key].trim();
    if(value.length<min||value.length>max||/[\x00-\x1f<>]/.test(value))throw new Error('Проверьте поле «'+key+'».');
    return value;
  };
  const phone=text('phone',8,30).replace(/[\s()-]/g,'');
  if(!/^\+[1-9]\d{7,14}$/.test(phone))throw new Error('Введите телефон в международном формате, например +7 705 131 03 39.');
  const city=text('city',2,80),street=text('street',3,160);
  const latitude=input.latitude,longitude=input.longitude;
  if(typeof latitude!=='number'||!Number.isFinite(latitude)||Math.abs(latitude)>90||typeof longitude!=='number'||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error('Проверьте координаты точки маршрута.');
  const twoGisId=input.twoGisId;
  if(typeof twoGisId!=='string'||!/^\d{0,25}$/.test(twoGisId))throw new Error('Проверьте идентификатор здания 2ГИС или оставьте поле пустым.');
  const prices={};
  if(!input.prices||typeof input.prices!=='object')throw new Error('Заполните цены услуг.');
  for(const service of services){
    const price=input.prices[service.id];
    if(!Number.isSafeInteger(price)||price<1||price>10000000)throw new Error('Цена «'+service.name+'» должна быть целым числом от 1 до 10 000 000 ₸.');
    prices[service.id]=price;
  }
  return {phone,city,street,latitude,longitude,twoGisId,prices};
}
export function renderPage(template,path,data,env) {
  const links=routes(data);
  const siteUrl=(env.SITE_URL||'').replace(/\/$/,'');
  const indexable=env.INDEXABLE==='true' && /^https:\/\/[^/]+$/.test(siteUrl);
  const values={ADDRESS:`${data.city}, ${data.street}`,STREET:data.street,STREET_UPPER:data.street.toUpperCase(),CITY:data.city,CITY_UPPER:data.city.toUpperCase(),PHONE:data.phone,PHONE_DISPLAY:phoneDisplay(data.phone),PHONE_DIGITS:data.phone.slice(1),YANDEX:links.yandex,DGIS:links.dgis};
  for(const service of services)values['PRICE_'+service.id]=String(data.prices[service.id]).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
  const schemas=template.schemas.map(raw=>{
    const schema=JSON.parse(raw);
    if(schema['@type']==='HealthAndBeautyBusiness') {
      schema.telephone=data.phone;
      schema.address.streetAddress=data.street;
      schema.address.addressLocality=data.city;
      schema.geo.latitude=data.latitude;schema.geo.longitude=data.longitude;
      if(indexable){schema.url=siteUrl+'/';schema.image=siteUrl+'/assets/hero-blue.jpg';}
    }
    if(schema['@type']==='Service'){
      schema.areaServed.name=data.city;schema.provider.telephone=data.phone;
      schema.offers.priceSpecification.minPrice=data.prices[path.split('/')[2]];
    }
    return JSON.stringify(schema).replace(/</g,'\\u003c');
  });
  const seo='<meta name="robots" content="'+(indexable&&path!='/404/'?'index, follow':'noindex, nofollow')+'">'+(indexable?'<link rel="canonical" href="'+escapeHtml(siteUrl+path)+'"><meta property="og:url" content="'+escapeHtml(siteUrl+path)+'">':'');
  return template.html.replace(/@@([A-Z_]+[a-z0-9_-]*)@@/g,(match,key)=>{
    if(key==='SEO')return seo;
    if(key.startsWith('SCHEMA_'))return schemas[Number(key.slice(7))-1];
    if(!(key in values))throw new Error('Unknown template key: '+key);
    return escapeHtml(values[key]);
  }).replace(/(<meta property="og:image" content=")\//g,'$1'+escapeHtml(siteUrl)+'/');
}
