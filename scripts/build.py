#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dependency-free static site builder. Preview by default; --production needs --site-url."""
from pathlib import Path
import argparse, html, json, shutil, re
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--production', action='store_true')
parser.add_argument('--site-url', default='')
parser.add_argument('--output', default='dist')
args = parser.parse_args()
BASE = args.site_url.rstrip('/')
if args.production and (not BASE.startswith('https://') or not urlparse(BASE).netloc):
    parser.error('--production requires an https --site-url')
OUT = ROOT / args.output
OUT.mkdir(parents=True, exist_ok=True)
shutil.copytree(ROOT / 'assets', OUT / 'assets', dirs_exist_ok=True)
e = html.escape
PHONE = '+77051310339'
DISPLAY = '+7 705 131 03 39'
ADDRESS = 'Алматы, ул. Маркова, 28'
YANDEX = 'https://yandex.kz/maps/?mode=routes&rtext=~43.230853%2C76.929838&rtt=auto&ll=76.929838%2C43.230853&z=16'
DGIS = 'https://2gis.kz/almaty/directions/points/%7C76.929838%2C43.230853%3B9430047374996996'

def wa(service='массаж или шугаринг'):
    return 'https://wa.me/77051310339?text=' + quote(f'Здравствуйте! Хочу записаться на {service}. Подскажите, пожалуйста, стоимость и свободное время.')

def icon(name):
    paths = {
        'leaf':'<path d="M19 4C9 3 3 9 7 16s15 1 12-12Z"/><path d="M5 21 16 8"/>',
        'pin':'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
        'phone':'<path d="m5 3 4 4-2 3c2 3 4 5 7 7l3-2 4 4c-2 4-6 3-11-1S1 8 5 3Z"/>',
        'chat':'<path d="M21 11.5a9 9 0 0 1-13.5 7.8L3 21l1.6-4.8A9 9 0 1 1 21 11.5Z"/><path d="M8 10h8M8 14h5"/>',
        'spark':'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
        'check':'<path d="m5 12 4 4L19 6"/>',
        'heart':'<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 2 10 8 15 6-5 12-11 8-15Z"/>',
    }
    return f'<svg class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'

SERVICES = [
 {'slug':'klassicheskiy','name':'Классический массаж','short':'Знакомый способ замедлиться и уделить внимание всему телу.','tag':'Для расслабления','image':'massage','intro':'Когда хочется отложить дела, выдохнуть и побыть в тишине. Классический массаж — понятная отправная точка, если вы выбираете процедуру впервые.','focus':'В привычном ритме — пауза для себя','body':'Вы можете выбрать общий сеанс или сосредоточиться на отдельной зоне. Перед записью расскажите мастеру, что вам ближе: спокойный расслабляющий формат или более интенсивная работа с мышцами.','points':['Общий массаж или выбранная зона','Интенсивность обсуждается до сеанса','Подходит для знакомства с массажем'],'faq':[('Можно выбрать только спину?','Да, можно записаться на массаж отдельной зоны. Уточните у мастера нужную область и стоимость до посещения.'),('Сколько длится сеанс?','Продолжительность зависит от выбранного формата. Мастер уточнит её при записи вместе с итоговой ценой.')]},
 {'slug':'sportivnyy','name':'Спортивный массаж','short':'Внимание мышцам, которые работают вместе с вами.','tag':'Для активного ритма','image':'legs','intro':'Тренировки, прогулки, насыщенный день — у активного тела свои запросы. Спортивный массаж выбирают, чтобы уделить внимание мышцам и сделать уход за собой частью привычного ритма.','focus':'Забота о теле между тренировками','body':'Расскажите мастеру, каким спортом занимаетесь и на какие зоны хотели бы обратить внимание. Интенсивность, время и формат сеанса нужно согласовать индивидуально.','points':['Акцент на выбранных группах мышц','Формат с учётом ваших пожеланий','Общий сеанс или отдельная зона'],'faq':[('Нужно ли быть спортсменом?','Нет. Вы можете обсудить этот формат, если ведёте активный образ жизни. Подходящий вид массажа и интенсивность согласуются перед сеансом.'),('Можно ли прийти после травмы?','Вопрос о массаже после травмы сначала обсудите с лечащим врачом. При записи обязательно сообщите мастеру об ограничениях.')]},
 {'slug':'lechebnyy','name':'Лечебный массаж','short':'Индивидуальный запрос, который важно обсудить заранее.','tag':'По вашему запросу','image':'massage','intro':'Если вы ищете лечебный массаж в Алматы, сначала обсудите с мастером ваш запрос, рекомендации врача и возможные ограничения. Возможность проведения процедуры уточняется до записи.','focus':'Сначала — ваш запрос и ограничения','body':'Название услуги не означает постановку диагноза или обещание лечения. Массаж не заменяет консультацию врача. При боли, заболевании или восстановлении после травмы допустимость процедуры определяет врач.','points':['Предварительное обсуждение запроса','Внимание рекомендациям врача','Согласование зоны и интенсивности'],'faq':[('Можно ли записаться при боли?','Сначала обратитесь к врачу, чтобы выяснить причину боли и допустимость массажа. После этого обсудите рекомендации и ограничения с мастером.'),('Какая стоимость?','Стоимость массажа начинается от 5 000 ₸. Итоговая цена зависит от зоны и формата; её нужно уточнить до посещения.')]},
 {'slug':'antitsellyulitnyy','name':'Антицеллюлитный массаж','short':'Уход за телом с акцентом на выбранные зоны.','tag':'Для ухода за телом','image':'legs','intro':'Отдельное время для ухода за телом. Антицеллюлитный массаж — локальный формат, в котором внимание уделяется выбранным зонам и вашим пожеланиям к процедуре.','focus':'Уход без завышенных ожиданий','body':'Обсудите с мастером зоны, чувствительность кожи и комфортную интенсивность. Результат индивидуален: процедура не сопровождается обещаниями конкретного уменьшения объёмов или изменения веса.','points':['Выбор зоны перед посещением','Обсуждение комфортной интенсивности','Разовый визит или обсуждение курса'],'faq':[('Обязательно покупать курс?','Начните с обсуждения одного посещения. Необходимость и количество дальнейших сеансов согласуются отдельно.'),('Гарантирован ли результат?','Результаты индивидуальны. Конкретные изменения объёмов, веса или состояния кожи не гарантируются.')]},
 {'slug':'limfodrenazhnyy','name':'Лимфодренажный массаж','short':'Более мягкий ритм для бережного ухода за телом.','tag':'Для мягкого ухода','image':'legs','intro':'Для тех, кто предпочитает спокойный ритм и мягкое воздействие. Перед записью на лимфодренажный массаж обсудите с мастером цель посещения и особенности самочувствия.','focus':'Спокойный ритм. Внимание к ощущениям.','body':'Вместе с мастером уточните подходящие зоны, длительность и интенсивность. Если ваш запрос связан с отёками или заболеванием, сначала получите рекомендации врача о допустимости процедуры.','points':['Обсуждение мягкого формата','Внимание к чувствительности','Выбор зоны и продолжительности'],'faq':[('Можно ли записаться из-за отёков?','Причины отёков должен оценить врач. Массаж не заменяет диагностику; согласуйте допустимость процедуры с врачом до записи.'),('Какие зоны можно выбрать?','Напишите мастеру, какая область вас интересует. Возможность работы с конкретной зоной и цену мастер подтвердит при записи.')]},
 {'slug':'obshchiy','name':'Общий массаж','short':'Одна большая пауза для внимания к телу.','tag':'Для всего тела','image':'massage','intro':'Когда хочется посвятить время телу целиком, а не одной зоне. Общий массаж — формат сеанса, в котором последовательность и области работы обсуждаются с мастером заранее.','focus':'Время для тела целиком','body':'Общий массаж можно обсудить в классическом или другом доступном формате. Расскажите мастеру о пожеланиях, чувствительности и зонах, которым хочется уделить больше внимания.','points':['Несколько зон в одном сеансе','Обсуждение акцентов перед процедурой','Продолжительность согласуется при записи'],'faq':[('Что входит в общий массаж?','Перечень зон и последовательность работы мастер уточнит до сеанса. Сообщите, если какую-то область нужно исключить.'),('Чем отличается от классического?','Общий — это формат по охвату тела, а классический — вид массажа. Общий сеанс может проводиться в классическом формате.')]},
 {'slug':'po-zonam','name':'Массаж по зонам','short':'Спина, шея, ноги — внимание там, где его хочется.','tag':'Для конкретной зоны','image':'massage','intro':'Не обязательно выбирать общий сеанс. Можно уделить внимание отдельной области: спине, шейно-воротниковой зоне, ногам или стопам. Доступные варианты уточняются при записи.','focus':'Больше внимания одной области','body':'Выберите зону и расскажите о вашем запросе мастеру. Так проще согласовать подходящий вид массажа, длительность посещения и точную стоимость.','points':['Спина и поясница','Шейно-воротниковая зона','Ноги и стопы'],'faq':[('Можно совместить несколько зон?','Обсудите сочетание зон с мастером. Продолжительность и итоговая стоимость будут зависеть от согласованного формата.'),('Массаж по зонам дешевле общего?','Минимальная стоимость массажа — от 5 000 ₸. Точную цену для выбранной зоны и длительности уточните у мастера.')]}
]

for service, asset, alt in zip(SERVICES, ['classic-detail', 'sport-detail', 'therapy-detail', 'anti-detail', 'lymph-detail', 'general-detail', 'zones-detail'], ['Массаж предплечья и кисти — иллюстрация классического массажа', 'Работа с мышцами плеча — иллюстрация спортивного массажа', 'Локальная работа с областью лопатки — иллюстрация массажа', 'Массаж наружной поверхности бедра — иллюстрация ухода за телом', 'Мягкий массаж стопы и голеностопа — иллюстрация процедуры', 'Общий массаж: работа с плечами на массажной кушетке — иллюстрация', 'Массаж шейно-воротниковой зоны в положении сидя — иллюстрация']):
    service["image"] = asset
    service["alt"] = alt

PAGES = []
TEMPLATES = {}
PAGE_IMAGES = {}

def book(label='Записаться в WhatsApp', service='', cls='button primary'):
    return f'<a class="{cls}" href="{wa(service or "массаж или шугаринг")}" data-book="{e(service)}">{icon("chat")}{label}</a>'

def ext(url, label, cls='text-link'):
    return f'<a class="{cls}" href="{e(url)}" target="_blank" rel="noopener noreferrer">{label}</a>'

def image(name, alt, eager=False, cls=''):
    return f'<img class="{cls}" src="/assets/{name}.jpg" srcset="/assets/{name}-small.jpg 720w, /assets/{name}.jpg 1440w" sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 900px) 50vw, 600px" width="1440" height="960" alt="{e(alt)}" {"fetchpriority=high" if eager else "loading=lazy"} decoding="async">'

def header(active):
    nav = [('/massazh/','Массаж'),('/shugaring/','Шугаринг'),('/ceny/','Цены'),('/o-mastere/','О мастере'),('/kontakty/','Контакты')]
    links=''.join(f'<a href="{u}" '+('aria-current="page"' if active==u else '')+f'>{t}</a>' for u,t in nav)
    return f'''<a class="skip-link" href="#main">Перейти к содержимому</a>
    <div class="topline"><div class="container"><span>АЛМАТЫ · МАРКОВА, 28</span><span>Массаж и забота о теле</span><a href="tel:{PHONE}">{DISPLAY}</a></div></div>
    <header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="Лавелия — главная">{icon('leaf')}<span>Лавелия<small>МАССАЖ И УХОД</small></span></a><nav id="navigation" aria-label="Главное меню">{links}</nav>{book('Записаться',cls='button primary header-book')}<button class="menu-toggle" aria-expanded="false" aria-controls="navigation" aria-label="Открыть меню"><span></span><span></span></button></div></header>'''

def footer():
    service_links=''.join(f'<a href="/massazh/{s["slug"]}/">{s["name"]}</a>' for s in SERVICES)
    return f'''<footer><div class="container footer-grid"><div><a href="/" class="brand">{icon('leaf')}<span>Лавелия<small>МАССАЖ И УХОД</small></span></a><p>Маленькая пауза.<br>Большая забота о себе.</p></div><div><h3>Массаж</h3>{service_links}</div><div><h3>Для вас</h3><a href="/shugaring/">Шугаринг</a><a href="/ceny/">Услуги и цены</a><a href="/o-mastere/">О мастере</a><a href="/kontakty/">Как добраться</a></div><div><h3>На связи</h3><a class="footer-phone" href="tel:{PHONE}">{DISPLAY}</a><p>{ADDRESS}<br>Время приёма — по договорённости</p>{ext(wa(),'Написать мастеру')}</div></div><div class="container footer-bottom"><span>© 2026 Лавелия · Алматы</span><span>Изображения созданы с помощью ИИ и носят иллюстративный характер.</span></div></footer>
    <div class="mobile-bar"><a href="tel:{PHONE}" aria-label="Позвонить мастеру">{icon('phone')}Позвонить</a>{book('Записаться')}</div>
    <dialog id="booking" aria-labelledby="booking-title"><button class="dialog-close" aria-label="Закрыть окно записи">×</button><p class="eyebrow">ВАШЕ ВРЕМЯ ДЛЯ СЕБЯ</p><h2 id="booking-title">Давайте выберем<br>ваш уход.</h2><p>Выберите услугу — откроется WhatsApp с готовым текстом для мастера.</p><label for="booking-service">Что вас интересует?</label><select id="booking-service"><option value="массаж или шугаринг">Помогите определиться</option>{''.join(f'<option>{s["name"]}</option>' for s in SERVICES)}<option>Шугаринг</option></select><a id="booking-send" class="button primary" target="_blank" rel="noopener noreferrer" href="{wa()}">{icon('chat')}Продолжить в WhatsApp</a><a class="dialog-phone" href="tel:{PHONE}">Или позвоните: {DISPLAY}</a><small>Время и стоимость подтвердит мастер лично. Сообщение отправляете вы.</small></dialog>'''

def page(path, title, desc, body, active='', schema_extra=None):
    canonical=f'<link rel="canonical" href="{e(BASE+path)}"><meta property="og:url" content="{e(BASE+path)}">' if args.production else ''
    business={'@context':'https://schema.org','@type':'HealthAndBeautyBusiness','name':'Лавелия — массаж и уход','telephone':PHONE,'address':{'@type':'PostalAddress','streetAddress':'ул. Маркова, 28','addressLocality':'Алматы','addressCountry':'KZ'},'geo':{'@type':'GeoCoordinates','latitude':43.230853,'longitude':76.929838},'currenciesAccepted':'KZT'}
    if args.production: business.update({'url':BASE+'/', 'image':BASE+'/assets/hero-blue.jpg'})
    page_image = re.search(r'<img[^>]+src="/assets/([^"/]+)\.jpg"',body)
    share_image = page_image.group(1) if page_image else 'hero-blue'
    if schema_extra and args.production:
        schema_extra['image'] = BASE+'/assets/'+share_image+'.jpg'
    schemas=[business]+([schema_extra] if schema_extra else [])
    if path != '/' and path != '/404/' and args.production:
        parts=[{'@type':'ListItem','position':1,'name':'Главная','item':BASE+'/'}]
        if path.startswith('/massazh/') and path!='/massazh/':
            parts.append({'@type':'ListItem','position':2,'name':'Массаж','item':BASE+'/massazh/'})
        label = re.search(r'aria-current="page">([^<]+)</span>',body)
        parts.append({'@type':'ListItem','position':len(parts)+1,'name':label.group(1) if label else title.split(' | ')[0],'item':BASE+path})
        schemas.append({'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':parts})
    schema_markup = ''.join('<script type="application/ld+json">'+json.dumps(s,ensure_ascii=False)+'</script>' for s in schemas)
    back_url = '/massazh/' if path.startswith('/massazh/') and path != '/massazh/' else '/'
    back_nav = f'<div class="container page-back"><a class="button outline back-link" href="{back_url}" data-back>Назад</a></div>' if path != '/' else ''
    doc=f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>{e(title)}</title><meta name="description" content="{e(desc)}"><meta name="robots" content="{'index, follow' if args.production else 'noindex, nofollow'}"><meta name="theme-color" content="#c8bed8">{canonical}<meta property="og:type" content="website"><meta property="og:locale" content="ru_RU"><meta property="og:site_name" content="Лавелия — массаж и уход"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{e(BASE)}/assets/{share_image}.jpg"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/fonts.css"><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/brand.css"><link rel="stylesheet" href="/assets/motion.css"><link rel="stylesheet" href="/assets/floral.css"><script src="/assets/site.js" defer></script><script src="/assets/motion.js" defer></script>{schema_markup}</head><body data-site-phone="77051310339">{header(active)}<main id="main">{back_nav}{body}</main>{footer()}</body></html>'''
    from templates import make_template
    TEMPLATES[path] = make_template(doc, path)
    target=OUT/path.strip('/')/'index.html' 
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(doc)
    PAGES.append(path)
    PAGE_IMAGES[path] = re.findall(r'<img[^>]+src="([^"]+)"', body)

def crumbs(label, parent=None):
    return '<nav class="breadcrumbs container" aria-label="Хлебные крошки"><a href="/">Главная</a><span>/</span>'+('<a href="/massazh/">Массаж</a><span>/</span>' if parent else '')+f'<span aria-current="page">{label}</span></nav>'

def faq(items):
    return '<div class="faq-list">'+''.join(f'<details><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>' for q,a in items)+'</div>'

def faq_section(items):
    return '<section class="section container faq-section"><div><p class="eyebrow">ПЕРЕД ПЕРВЫМ ВИЗИТОМ</p><h2>Чтобы было <br><em>спокойнее.</em></h2><p>Не нашли свой ответ?<br>Мастер подскажет лично.</p>'+ext(wa(),'Задать вопрос в WhatsApp')+'</div>'+faq(items)+'</section>'

def cta():
    return f'<section class="cta container"><div>{icon("leaf")}<p class="eyebrow">СЕБЯ МОЖНО ПОСТАВИТЬ НА ПЕРВОЕ МЕСТО</p><h2>Ваше время — <em>сейчас.</em></h2><p>Напишите мастеру. Выберите уход и удобное время.</p>{book()}</div><span class="cta-art" aria-hidden="true"></span></section>'

def contact_section():
    return f'''<section class="section container contact-section"><div><p class="eyebrow">РЯДОМ, В АЛМАТЫ</p><h2>Встретимся<br>на <em>Маркова, 28.</em></h2><p>Приезжайте на своё время заботы о себе.<br>Перед визитом согласуйте запись с мастером.</p></div><div class="contact-details"><address>{icon('pin')}{ADDRESS}</address><a class="contact-phone" href="tel:{PHONE}">{DISPLAY}</a><p class="muted">Время приёма, этаж и вход уточните при записи.</p><details class="route-picker"><summary class="button primary">{icon('pin')}Построить маршрут<i class="route-chevron" aria-hidden="true"></i></summary><div class="route-options" role="group" aria-label="Выберите карты для маршрута">{ext(YANDEX,'Яндекс Карты','button outline')}{ext(DGIS,'2ГИС','button outline')}</div></details></div></section>'''

def service_card(s, photo=False, photo_name=None, alt=None):
    return f'<a class="service-card {"photo-card" if photo else ""}" href="/massazh/{s["slug"]}/">'+(image(photo_name or s['image'],alt or s['alt']) if photo else '')+f'<div><span class="card-tag">{s["tag"]}</span><h3>{s["name"]}</h3><p>{s["short"]}</p><div class="card-bottom"><span data-price="{s["slug"]}">от 5 000 ₸</span><span class="card-link">Подробнее</span></div></div></a>'

HOME_FAQ=[('Как записаться на массаж?','Напишите мастеру в WhatsApp или позвоните по номеру +7 705 131 03 39. Укажите услугу, желаемую зону и удобное время. Запись подтверждается лично.'),('Сколько стоит массаж и шугаринг?','Цены указаны отдельно для каждой услуги в прайс-листе. Итоговая стоимость зависит от зоны, длительности и выбранного формата. Уточните её до посещения.'),('Как выбрать вид массажа?','Если вы пока не определились, расскажите мастеру о пожеланиях к процедуре. Вид массажа, зону и интенсивность можно обсудить при записи.'),('Где находится салон?','В Алматы, на улице Маркова, 28. Нажмите «Построить маршрут» и выберите Яндекс Карты или 2ГИС. Этаж и удобный вход уточните у мастера.'),('Есть ли ограничения для массажа?','Да, у массажа есть противопоказания. Если у вас есть заболевания, беременность, травмы или сомнения в допустимости процедуры, обсудите её с врачом и сообщите об ограничениях мастеру.')]

home=f'''<div class="hero-shell"><section class="hero container"><div class="hero-copy"><p class="eyebrow line">МАССАЖ И ШУГАРИНГ В АЛМАТЫ</p><h1>Массаж в Алматы.<br><em>Время для себя.</em></h1><p class="hero-intro">Забота, которую вы давно откладывали. <br>Общий массаж, внимание к отдельным зонам<br class="desktop"> и бережный уход — в «Лавелии».</p><div class="actions">{book('Выбрать время')}<a href="/massazh/" class="button outline">Посмотреть услуги</a></div><div class="hero-facts"><div><strong>Массаж</strong><span>общий и по зонам</span></div><div><strong>от 2 000 ₸</strong><span>шугаринг</span></div></div></div><div class="hero-visual">{image('hero-blue','Массаж плеч и верхней части спины на синей кушетке — иллюстрация',True)}<span class="hero-caption">Меньше спешки.<br><i>Больше себя.</i></span><div class="photo-note">{icon('leaf')}Забота в каждом прикосновении</div></div></section></div>
<div class="values-bar container"><span>{icon('pin')}Алматы, Маркова, 28</span><span>{icon('heart')}Общий массаж и по зонам</span><span>{icon('chat')}Личная запись к мастеру</span></div>
<section class="section container"><div class="section-heading"><div><p class="eyebrow">МЕНЮ ЗАБОТЫ О СЕБЕ</p><h2>Что нужно вашему<br><em>телу сегодня?</em></h2></div><p>Пауза после рабочего дня, внимание<br class="desktop"> к мышцам или время для ухода.<br class="desktop"> Найдите свой формат.</p></div><div class="featured-grid">{service_card(SERVICES[0],True,'home-classic','Массаж шеи: руки мастера на шейно-воротниковой зоне, вид сверху — иллюстрация')}{service_card(SERVICES[1],True,'home-sport','Массаж икроножной мышцы после активности — иллюстрация')}<a class="service-card photo-card" href="/shugaring/">{image('home-sugar','Янтарная сахарная паста на деревянном шпателе — иллюстрация')}<div><span class="card-tag">Для гладкой кожи</span><h3>Шугаринг</h3><p>Уход, после которого приятно прикоснуться к себе.</p><div class="card-bottom"><span>от 2 000 ₸</span><span class="card-link">Подробнее</span></div></div></a></div><div class="service-chips">{''.join(f'<a href="/massazh/{s["slug"]}/">{s["name"]}</a>' for s in SERVICES[2:])}</div></section>
<section class="approach"><div class="container approach-grid"><div class="approach-image">{image('care-still-life','Массажное масло и чистые полотенца на бирюзовом фоне — иллюстрация ухода')}</div><div class="approach-copy"><p class="eyebrow">НЕ ПРОСТО ПУНКТ В СПИСКЕ ДЕЛ</p><h2>Место для паузы.<br><em>Время для вас.</em></h2><p>Иногда хочется всего одного: никуда не спешить и наконец прислушаться к себе.</p><p>Здесь можно начать с простого — выбрать массаж, обсудить свои пожелания и выделить время на заботу о теле.</p><div class="approach-note">{icon('leaf')}<span>Не знаете, что выбрать?<br>Обсудите свой запрос с мастером.</span></div><a class="text-link" href="/o-mastere/">Познакомиться ближе</a></div></div></section>
<section class="section container chooser-section"><div><p class="eyebrow">ПРИСЛУШАЙТЕСЬ К СЕБЕ</p><h2>Сегодня хочется…</h2><p>Выберите, что вам ближе. Это поможет начать разговор с мастером.</p></div><div class="chooser"><div class="choice-tabs" role="group" aria-label="Ваше пожелание"><button class="selected" data-choice="relax" aria-pressed="true">Выдохнуть</button><button data-choice="active" aria-pressed="false">После нагрузок</button><button data-choice="zone" aria-pressed="false">Уделить внимание зоне</button><button data-choice="care" aria-pressed="false">Ухода за кожей</button></div><div class="choice-result" aria-live="polite"><span class="eyebrow" id="choice-tag">ВАШ ВОЗМОЖНЫЙ ВЫБОР</span><h3 id="choice-title">Классический массаж</h3><p id="choice-description">Спокойная пауза и внимание к телу. Общий сеанс или выбранная зона — обсудите комфортный формат.</p><a id="choice-link" href="/massazh/klassicheskiy/" class="text-link">Подробнее об услуге</a></div></div></section>
{faq_section(HOME_FAQ)}{contact_section()}{cta()}'''
page('/','Массаж в Алматы — Лавелия, Маркова 28','Массаж и шугаринг в Алматы: классический, спортивный, лечебный, антицеллюлитный и лимфодренажный массаж. Общий сеанс и по зонам. Лавелия, Маркова, 28.',home)

catalog=crumbs('Массаж')+f'''<section class="page-intro container"><p class="eyebrow">ВЫБЕРИТЕ СВОЙ ФОРМАТ</p><h1>Массаж в Алматы.<br><em>От запроса к заботе.</em></h1><p>Общий сеанс или отдельная зона. Спокойный ритм или внимание к мышцам после нагрузки. Выберите подходящую услугу — стоимость указана в её карточке.</p></section><section class="container section compact"><div class="catalog-grid">{''.join(service_card(s) for i,s in enumerate(SERVICES))}</div><div class="notice">{icon('chat')}<p>Не уверены в выборе? Напишите мастеру о своих пожеланиях. Длительность и итоговая стоимость согласуются при записи.</p>{book('Обсудить массаж')}</div></section>{faq_section(HOME_FAQ[:3])}{cta()}'''
page('/massazh/','Виды массажа в Алматы | Лавелия','Классический, спортивный, лечебный, антицеллюлитный и лимфодренажный массаж. Общий массаж и по зонам в Алматы, Маркова 28. Запись к мастеру.',catalog,'/massazh/')

for s in SERVICES:
    body=crumbs(s['name'],True)+f'''<section class="container detail-hero"><div><p class="eyebrow">{s['tag'].upper()} · АЛМАТЫ</p><h1>{s['name']}<br><em>в «Лавелии».</em></h1><p>{s['intro']}</p><div class="detail-price">от 5 000 ₸<span>Стоимость и длительность уточняются при записи</span></div>{book('Обсудить запись',s['name'])}</div><div class="detail-image">{image(s['image'],s['alt'],True)}</div></section><section class="section container details-content"><div><p class="eyebrow">ОБ УСЛУГЕ</p><h2>{s['focus']}</h2><p>{s['body']}</p></div><ul class="feature-list">{''.join('<li>'+icon('check')+p+'</li>' for p in s['points'])}</ul></section><section class="steps-section"><div class="container"><p class="eyebrow">ВСЁ НАЧИНАЕТСЯ С ДИАЛОГА</p><h2>От сообщения — <em>к вашему сеансу.</em></h2><div class="steps"><div>{icon('chat')}<h3>Расскажите о себе</h3><p>Напишите, какой массаж и какая зона вас интересуют.</p></div><div>{icon('heart')}<h3>Обсудите детали</h3><p>Согласуйте пожелания, ограничения, длительность и цену.</p></div><div>{icon('pin')}<h3>Приходите в своё время</h3><p>Мастер подтвердит запись и подскажет, как найти вход.</p></div></div></div></section>{faq_section(s['faq'])}<section class="section container"><div class="section-heading"><h2>Другие форматы <em>заботы.</em></h2><a href="/massazh/" class="text-link">Все виды массажа</a></div><div class="service-chips">{''.join(f'<a href="/massazh/{x["slug"]}/">{x["name"]}</a>' for x in SERVICES if x['slug']!=s['slug'])}</div></section>{cta()}'''
    schema={'@context':'https://schema.org','@type':'Service','name':s['name'],'serviceType':s['name'],'areaServed':{'@type':'City','name':'Алматы'},'provider':{'@type':'HealthAndBeautyBusiness','name':'Лавелия — массаж и уход','telephone':PHONE},'description':s['short'],'offers':{'@type':'Offer','priceCurrency':'KZT','priceSpecification':{'@type':'PriceSpecification','minPrice':5000,'priceCurrency':'KZT'}}}
    page('/massazh/'+s['slug']+'/',s['name']+' в Алматы от 5 000 ₸ | Лавелия',s['name']+' в Алматы на Маркова, 28. '+s['short']+' Цена от 5 000 ₸. Запись: '+DISPLAY+'.',body,'/massazh/',schema)

shugaring=crumbs('Шугаринг')+f'''<section class="container detail-hero"><div><p class="eyebrow">БЕРЕЖНЫЙ УХОД · АЛМАТЫ</p><h1>Гладкость,<br>которую хочется<br><em>почувствовать.</em></h1><p>Шугаринг в «Лавелии» — удаление нежелательных волос сахарной пастой. Выберите нужную зону и договоритесь о комфортном времени.</p><div class="detail-price">от 2 000 ₸<span>Итоговая стоимость зависит от выбранной зоны</span></div>{book('Записаться на шугаринг','Шугаринг')}</div><div class="detail-image">{image('sugar-detail','Нанесение сахарной пасты на голень руками в перчатках — иллюстрация шугаринга',True)}</div></section><section class="section container details-content"><div><p class="eyebrow">ВАШ УХОД — ВАШ ВЫБОР</p><h2>Внимание<br><em>к каждой детали.</em></h2><p>Перед посещением уточните доступные зоны, время процедуры и цену. Расскажите о чувствительности кожи и предыдущем опыте — это поможет обсудить детали заранее.</p></div><ul class="feature-list"><li>{icon('check')}Выбор зоны при записи</li><li>{icon('check')}Предварительное согласование стоимости</li><li>{icon('check')}Подготовка и уход обсуждаются лично</li></ul></section>{faq_section([('Какие зоны можно выбрать?','Напишите мастеру, какая зона вас интересует. Доступность процедуры для этой зоны и стоимость мастер подтвердит при записи.'),('Как подготовиться к процедуре?','Уточните рекомендации у мастера заранее: они зависят от выбранной зоны, состояния кожи и предыдущего способа удаления волос.'),('Что входит в цену от 2 000 ₸?','Это минимальная стоимость шугаринга. Цена конкретной зоны и сочетания нескольких зон согласуется отдельно до посещения.'),('Можно совместить с массажем?','Обсудите с мастером возможность и порядок процедур в один день. Мастер уточнит, какой вариант подходит для вашей записи.')])}{cta()}'''
page('/shugaring/','Шугаринг в Алматы от 2 000 ₸ — Лавелия, Маркова 28','Шугаринг в Алматы на Маркова, 28 от 2 000 ₸. Выбор зоны, согласование стоимости и личная запись к мастеру по телефону '+DISPLAY+'.',shugaring,'/shugaring/')

prices=crumbs('Цены')+f'''<section class="page-intro container"><p class="eyebrow">ПОНЯТНО ДО ПОСЕЩЕНИЯ</p><h1>Забота о себе.<br><em>Ваш формат, ваша цена.</em></h1><p>Стоимость указана отдельно для каждой услуги. Выберите подходящий формат массажа или шугаринга. Итоговая цена зависит от зоны и длительности и согласуется до визита.</p></section><section class="container section compact price-section"><div class="price-table"><div class="price-head"><span>Услуга</span><span>Стоимость</span></div>{''.join(f'<a href="/massazh/{s["slug"]}/" class="price-row"><span>{s["name"]}<small>{s["tag"]}</small></span><strong data-price="{s["slug"]}">от 5 000 ₸</strong></a>' for s in SERVICES)}<a href="/shugaring/" class="price-row"><span>Шугаринг<small>Выбранная зона</small></span><strong>от 2 000 ₸</strong></a></div><aside class="price-aside"><p class="eyebrow">БЕЗ ДОГАДОК</p><h2>Узнайте<br><em>точную цену.</em></h2><p>Напишите, какую услугу и зону вы выбрали. Мастер уточнит длительность, стоимость и ближайшее свободное время.</p>{book('Уточнить стоимость')}<p class="muted">Цены указаны в тенге. «От» означает минимальную стоимость услуги.</p></aside></section>{faq_section(HOME_FAQ[:3])}{cta()}'''
page('/ceny/','Цены на массаж и шугаринг в Алматы | Лавелия','Цены на отдельные виды массажа и шугаринг в салоне Лавелия. Выберите услугу и уточните стоимость у мастера. Алматы, Маркова 28.',prices,'/ceny/')

about=crumbs('О мастере')+f'''<section class="container detail-hero"><div><p class="eyebrow">ЛИЧНАЯ ЗАПИСЬ · ЛИЧНОЕ ОБЩЕНИЕ</p><h1>Лавелия.<br>Массаж и <em>забота<br>о вашем теле.</em></h1><p>За выбором процедуры всегда стоит человек и его пожелания. Поэтому знакомство начинается с разговора: что вас интересует, какой формат ближе и когда удобно прийти.</p>{book('Познакомиться в WhatsApp')}</div><div class="about-art"><span class="big-g">Л</span>{icon('leaf')}<p>Время, которое<br>вы посвящаете <em>себе.</em></p><small>Лавелия · Алматы · Маркова, 28</small></div></section><section class="section container details-content"><div><p class="eyebrow">ЧТО МОЖНО ВЫБРАТЬ</p><h2>От массажа<br><em>до ухода за кожей.</em></h2><p>В «Лавелии» можно записаться на классический, спортивный, лечебный, антицеллюлитный и лимфодренажный массаж. Выбрать общий сеанс или отдельную зону. Дополнительно доступен шугаринг.</p><a href="/massazh/" class="text-link">Изучить услуги</a></div><div class="quote-block">«Забота о себе начинается<br>с простого решения —<br><em>найти для себя время.</em>»<small>Наша философия</small></div></section>{contact_section()}{cta()}'''
page('/o-mastere/','О мастере — Лавелия, массаж и уход в Алматы','Массаж и шугаринг в «Лавелии» в Алматы. Личная запись, выбор процедуры и обсуждение пожеланий. Адрес: Маркова 28. Телефон '+DISPLAY+'.',about,'/o-mastere/')

contacts=crumbs('Контакты')+f'''<section class="page-intro container"><p class="eyebrow">ДО ВСТРЕЧИ В «ЛАВЕЛИИ»</p><h1>Мы ближе,<br><em>чем кажется.</em></h1><p>Массаж и шугаринг в Алматы, на Маркова, 28. Напишите или позвоните, чтобы договориться о посещении.</p><div class="actions">{book()}<a class="button outline" href="tel:{PHONE}">{icon('phone')}Позвонить</a></div></section>{contact_section()}<section class="container before-visit"><h2>Перед тем как отправиться</h2><div class="steps"><div><h3>Подтвердите запись</h3><p>Свободное время и длительность посещения уточняются лично у мастера.</p></div><div><h3>Уточните вход</h3><p>При записи попросите подсказать этаж, кабинет и удобный вход в здание.</p></div><div><h3>Откройте маршрут</h3><p>Нажмите «Построить маршрут» и выберите Яндекс Карты или 2ГИС. Адрес назначения уже указан.</p></div></div></section>{cta()}'''
page('/kontakty/','Контакты и маршрут — Лавелия, Алматы, Маркова 28','Как добраться на массаж к мастеру: Алматы, улица Маркова, 28. Маршрут в Яндекс Картах или 2ГИС. Запись по телефону '+DISPLAY+'.',contacts,'/kontakty/')

page('/404/','Страница не найдена — Лавелия','Вернитесь на главную страницу салона «Лавелия».', '<section class="container page-intro"><p class="eyebrow">СТРАНИЦА НЕ НАЙДЕНА</p><h1>Кажется, вы<br><em>немного свернули.</em></h1><p>Вернитесь к услугам или начните с главной.</p><a href="/" class="button primary">На главную</a></section>')
shutil.copyfile(OUT/'404/index.html',OUT/'404.html')
PAGES.remove('/404/')
if args.production:
    (OUT/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+BASE+'/sitemap.xml\n')
    urls=[]
    for path in PAGES:
        images=''.join('<image:image><image:loc>'+e(BASE+src)+'</image:loc></image:image>' for src in PAGE_IMAGES[path])
        urls.append('<url><loc>'+e(BASE+path)+'</loc>'+images+'</url>')
    (OUT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+''.join(urls)+'</urlset>')
else:
    (OUT/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
    if (OUT/'sitemap.xml').exists(): (OUT/'sitemap.xml').unlink()
(OUT/'_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n'+('  X-Robots-Tag: noindex, nofollow\n' if not args.production else ''))
print(f'Built {len(PAGES)} pages + 404 in {OUT} ({"production" if args.production else "preview — noindex"})')

(ROOT/'cloudflare').mkdir(exist_ok=True)
(ROOT/'cloudflare/pages.json').write_text(json.dumps(TEMPLATES,ensure_ascii=False))
shutil.copytree(ROOT/'admin', OUT/'admin', dirs_exist_ok=True)
