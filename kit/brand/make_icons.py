#!/usr/bin/env python3
"""Generate the Finandex icon family (SVG source of truth + PNG renders via headless Chromium)."""
import os, sys, asyncio
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

INK = "#EEF3EF"
GREEN = "#19F23A"
DEEP = "#0BA82A"

def tile(inner, title):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="{title}">
  <title>{title}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#121B15"/><stop offset="1" stop-color="#040705"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.72" cy="0.28" r="0.75">
      <stop offset="0" stop-color="{GREEN}" stop-opacity="0.16"/><stop offset="1" stop-color="{GREEN}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
      <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#bg)"/>
  <rect width="512" height="512" rx="116" fill="url(#halo)"/>
  <rect x="2" y="2" width="508" height="508" rx="114" fill="none" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="2"/>
{inner}
</svg>
'''

ICONS = {
  "finandex": ("Finandex", f'''
  <polygon points="140,128 380,128 380,192 184,192" fill="{INK}"/>
  <rect x="184" y="192" width="66" height="200" fill="{INK}"/>
  <polyline points="250,318 296,284 330,302 392,232" fill="none" stroke="{GREEN}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
  <circle cx="392" cy="232" r="14" fill="#FFFFFF"/>'''),
  "finandex-ai": ("Finandex AI", f'''
  <path d="M168 132 H344 A56 56 0 0 1 400 188 V300 A56 56 0 0 1 344 356 H232 L160 404 L172 356 H168 A56 56 0 0 1 112 300 V188 A56 56 0 0 1 168 132 Z" fill="none" stroke="{INK}" stroke-width="26" stroke-linejoin="round"/>
  <polyline points="170,300 220,256 262,276 330,206" fill="none" stroke="{GREEN}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
  <path d="M352 160 l9 22 22 9 -22 9 -9 22 -9 -22 -22 -9 22 -9 Z" fill="#FFFFFF"/>'''),
  "nasdaqdex": ("NASDAQDex", f'''
  <polygon points="124,140 196,140 196,372 140,372 140,172" fill="{INK}"/>
  <rect x="316" y="140" width="56" height="232" fill="{INK}"/>
  <line x1="180" y1="158" x2="332" y2="354" stroke="{GREEN}" stroke-width="40" stroke-linecap="round" filter="url(#glow)"/>'''),
  "snp500dex": ("SnP500Dex", f'''
  <path d="M344 178 C326 142 188 128 176 200 C164 268 340 246 340 318 C340 388 196 394 162 336" fill="none" stroke="{INK}" stroke-width="50" stroke-linecap="round"/>
  <path d="M206 244 C250 262 318 262 336 300" fill="none" stroke="{GREEN}" stroke-width="22" stroke-linecap="round" filter="url(#glow)"/>
  <rect x="362" y="352" width="18" height="40" rx="4" fill="{DEEP}"/><rect x="388" y="330" width="18" height="62" rx="4" fill="{GREEN}"/>'''),
  "commercedex": ("CommerceDex", f'''
  <path d="M196 206 C196 132 316 132 316 206" fill="none" stroke="{GREEN}" stroke-width="24" stroke-linecap="round" filter="url(#glow)"/>
  <path d="M144 200 H368 L388 392 H124 Z" fill="{INK}" stroke="{INK}" stroke-width="16" stroke-linejoin="round"/>
  <polyline points="178,344 228,300 262,320 330,252" fill="none" stroke="#08100B" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>'''),
  "idfinandex": ("IDFinanDex", f'''
  <rect x="124" y="150" width="54" height="212" fill="{INK}"/>
  <path fill-rule="evenodd" fill="{INK}" d="M214 150 H284 A106 106 0 0 1 284 362 H214 Z M266 204 H284 A52 52 0 0 1 284 308 H266 Z"/>
  <line x1="138" y1="400" x2="400" y2="136" stroke="{GREEN}" stroke-width="16" stroke-linecap="round" filter="url(#glow)"/>
  <circle cx="400" cy="136" r="10" fill="#FFFFFF"/>'''),
  "rupiahdex": ("RupiahDex", f'''
  <rect x="122" y="140" width="52" height="210" fill="{INK}"/>
  <path fill-rule="evenodd" fill="{INK}" d="M174 140 H232 A64 64 0 0 1 232 268 H174 Z M174 186 H228 A18 18 0 0 1 228 222 H174 Z"/>
  <polygon points="200,268 254,268 294,350 238,350" fill="{INK}"/>
  <rect x="312" y="214" width="46" height="176" fill="{INK}"/>
  <path fill-rule="evenodd" fill="{INK}" d="M358 214 H364 A56 56 0 0 1 364 326 H358 Z M358 252 H362 A18 18 0 0 1 362 288 H358 Z"/>
  <g stroke="{GREEN}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#glow)">
    <path d="M136 414 H376"/><path d="M158 392 L136 414 L158 436"/><path d="M354 392 L376 414 L354 436"/>
  </g>'''),
  "reksadex": ("ReksaDex", f'''
  <circle cx="256" cy="256" r="112" fill="none" stroke="{INK}" stroke-opacity="0.22" stroke-width="58"/>
  <circle cx="256" cy="256" r="112" fill="none" stroke="{INK}" stroke-width="58" stroke-dasharray="380 324" transform="rotate(-90 256 256)"/>
  <circle cx="256" cy="256" r="112" fill="none" stroke="{GREEN}" stroke-width="58" stroke-dasharray="190 514" stroke-dashoffset="-392" transform="rotate(-90 256 256)" filter="url(#glow)"/>
  <circle cx="256" cy="256" r="26" fill="#FFFFFF"/>'''),
  "idxdex": ("IDXDex", f'''
  <line x1="168" y1="214" x2="168" y2="372" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>
  <rect x="144" y="250" width="48" height="90" rx="6" fill="{INK}"/>
  <line x1="256" y1="168" x2="256" y2="336" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>
  <rect x="232" y="206" width="48" height="96" rx="6" fill="none" stroke="{INK}" stroke-width="12"/>
  <g filter="url(#glow)">
    <line x1="344" y1="116" x2="344" y2="300" stroke="{GREEN}" stroke-width="10" stroke-linecap="round"/>
    <rect x="320" y="146" width="48" height="118" rx="6" fill="{GREEN}"/>
  </g>
  <rect x="124" y="392" width="264" height="10" rx="5" fill="{INK}" fill-opacity="0.35"/>'''),
"cryptdex": ("CryptDex", f'''
  <polygon points="200,150 262,186 262,258 200,294 138,258 138,186" fill="none" stroke="{INK}" stroke-width="22" stroke-linejoin="round"/>
  <polygon points="312,218 374,254 374,326 312,362 250,326 250,254" fill="none" stroke="{GREEN}" stroke-width="22" stroke-linejoin="round" filter="url(#glow)"/>
  <circle cx="200" cy="222" r="18" fill="{INK}"/><circle cx="312" cy="290" r="18" fill="#FFFFFF"/>'''),
  "centralbankdex": ("CentralBankDex", f'''
  <polygon points="256,118 404,196 108,196" fill="{INK}"/>
  <rect x="140" y="214" width="34" height="132" rx="6" fill="{INK}"/><rect x="206" y="214" width="34" height="132" rx="6" fill="{INK}"/>
  <rect x="272" y="214" width="34" height="132" rx="6" fill="{INK}"/><rect x="338" y="214" width="34" height="132" rx="6" fill="{INK}"/>
  <rect x="116" y="362" width="280" height="22" rx="8" fill="{INK}"/>
  <line x1="128" y1="412" x2="384" y2="412" stroke="{GREEN}" stroke-width="14" stroke-linecap="round" filter="url(#glow)"/>'''),
  "fintechdex": ("FintechDex", f'''
  <rect x="168" y="112" width="176" height="288" rx="34" fill="none" stroke="{INK}" stroke-width="22"/>
  <rect x="230" y="134" width="52" height="10" rx="5" fill="{INK}"/>
  <polyline points="196,304 226,268 256,288 286,236 316,252" fill="none" stroke="{GREEN}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
  <path d="M206 186 H306 A14 14 0 0 1 320 200 V222 A14 14 0 0 1 306 236 H236 L214 252 L218 236 H206 A14 14 0 0 1 192 222 V200 A14 14 0 0 1 206 186 Z" fill="{INK}"/>'''),
  "salarydex": ("SalaryDex", f'''
  <path d="M212 186 V164 A20 20 0 0 1 232 144 H280 A20 20 0 0 1 300 164 V186" fill="none" stroke="{INK}" stroke-width="20"/>
  <rect x="120" y="186" width="272" height="188" rx="28" fill="{INK}"/>
  <rect x="120" y="258" width="272" height="16" fill="#08100B"/>
  <g filter="url(#glow)"><line x1="256" y1="348" x2="256" y2="236" stroke="{GREEN}" stroke-width="22" stroke-linecap="round"/>
  <polyline points="216,272 256,232 296,272" fill="none" stroke="{GREEN}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></g>'''),
  "startupdex": ("StartupDex", f'''
  <path d="M256 104 C316 140 338 214 324 300 H188 C174 214 196 140 256 104 Z" fill="{INK}"/>
  <circle cx="256" cy="204" r="30" fill="#08100B"/><circle cx="256" cy="204" r="14" fill="{GREEN}"/>
  <path d="M188 250 L144 300 L188 300 Z" fill="{INK}"/><path d="M324 250 L368 300 L324 300 Z" fill="{INK}"/>
  <path d="M226 318 C226 360 256 402 256 410 C256 402 286 360 286 318 Z" fill="{GREEN}" filter="url(#glow)"/>'''),
  "idfooddeliverydex": ("IDFoodDeliveryDex", f'''
  <path d="M136 262 H376 A120 120 0 0 1 136 262 Z" fill="{INK}"/>
  <rect x="200" y="368" width="112" height="18" rx="9" fill="{INK}"/>
  <line x1="300" y1="250" x2="388" y2="138" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>
  <line x1="276" y1="250" x2="352" y2="126" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>
  <g stroke="{GREEN}" stroke-width="14" stroke-linecap="round" filter="url(#glow)"><line x1="88" y1="200" x2="160" y2="200"/><line x1="104" y1="232" x2="176" y2="232"/><line x1="72" y1="168" x2="132" y2="168"/></g>
  <path d="M206 236 C196 214 220 204 210 184 M246 236 C236 214 260 204 250 184" fill="none" stroke="{INK}" stroke-width="10" stroke-linecap="round" stroke-opacity="0.6"/>'''),
  "opencompanydex": ("OpenCompanyDex", f'''
  <rect x="124" y="214" width="80" height="170" rx="8" fill="{INK}"/>
  <rect x="216" y="130" width="92" height="254" rx="8" fill="{INK}"/>
  <rect x="320" y="250" width="68" height="134" rx="8" fill="{INK}"/>
  <g fill="#08100B"><rect x="240" y="160" width="16" height="22" rx="3"/><rect x="268" y="160" width="16" height="22" rx="3"/><rect x="240" y="200" width="16" height="22" rx="3"/><rect x="268" y="200" width="16" height="22" rx="3"/><rect x="146" y="240" width="14" height="20" rx="3"/><rect x="170" y="240" width="14" height="20" rx="3"/></g>
  <rect x="240" y="240" width="44" height="22" rx="4" fill="{GREEN}" filter="url(#glow)"/>
  <line x1="112" y1="408" x2="400" y2="408" stroke="{GREEN}" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>'''),
  "personalfinandex": ("PersonalFinanDex", f'''
  <path d="M146 176 L330 130 L346 176" fill="none" stroke="{INK}" stroke-width="18" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="120" y="176" width="272" height="196" rx="30" fill="{INK}"/>
  <rect x="300" y="236" width="104" height="76" rx="22" fill="#08100B"/>
  <circle cx="338" cy="274" r="20" fill="{GREEN}" filter="url(#glow)"/>'''),
  "vcnetworkdex": ("VCNetworkDex", f'''
  <g stroke="{INK}" stroke-width="10" stroke-opacity="0.7"><line x1="160" y1="170" x2="256" y2="256"/><line x1="352" y1="160" x2="256" y2="256"/><line x1="150" y1="350" x2="256" y2="256"/><line x1="362" y1="352" x2="256" y2="256"/><line x1="160" y1="170" x2="352" y2="160"/><line x1="150" y1="350" x2="362" y2="352"/></g>
  <line x1="256" y1="256" x2="362" y2="352" stroke="{GREEN}" stroke-width="12" filter="url(#glow)"/>
  <circle cx="160" cy="170" r="28" fill="{INK}"/><circle cx="352" cy="160" r="24" fill="{INK}"/><circle cx="150" cy="350" r="24" fill="{INK}"/>
  <circle cx="256" cy="256" r="40" fill="{INK}"/><circle cx="362" cy="352" r="30" fill="{GREEN}" filter="url(#glow)"/>'''),
  "idhousingdex": ("IDHousingDex", f'''
  <polygon points="256,118 404,236 370,236 370,388 142,388 142,236 108,236" fill="{INK}"/>
  <rect x="226" y="296" width="60" height="92" rx="6" fill="#08100B"/>
  <rect x="172" y="262" width="36" height="36" rx="4" fill="#08100B"/><rect x="304" y="262" width="36" height="36" rx="4" fill="{GREEN}" filter="url(#glow)"/>
  <rect x="318" y="140" width="30" height="56" rx="4" fill="{INK}"/>
  <line x1="112" y1="414" x2="400" y2="414" stroke="{GREEN}" stroke-width="12" stroke-linecap="round" filter="url(#glow)"/>'''),
  "ipodex": ("IPODex", f'''
  <path d="M256 122 C200 122 176 168 176 218 V292 L146 336 H366 L336 292 V218 C336 168 312 122 256 122 Z" fill="{INK}"/>
  <rect x="246" y="96" width="20" height="30" rx="6" fill="{INK}"/>
  <circle cx="256" cy="360" r="22" fill="{GREEN}" filter="url(#glow)"/>
  <g stroke="{GREEN}" stroke-width="12" stroke-linecap="round" filter="url(#glow)"><line x1="118" y1="190" x2="146" y2="206"/><line x1="394" y1="190" x2="366" y2="206"/><line x1="110" y1="252" x2="140" y2="252"/><line x1="402" y1="252" x2="372" y2="252"/></g>'''),
  "inflationdex": ("InflationDex", f'''
  <circle cx="196" cy="196" r="40" fill="none" stroke="{INK}" stroke-width="22"/>
  <circle cx="316" cy="316" r="40" fill="none" stroke="{INK}" stroke-width="22"/>
  <line x1="330" y1="150" x2="182" y2="362" stroke="{INK}" stroke-width="24" stroke-linecap="round"/>
  <g filter="url(#glow)"><line x1="396" y1="276" x2="396" y2="118" stroke="{GREEN}" stroke-width="20" stroke-linecap="round"/>
  <polyline points="364,150 396,118 428,150" fill="none" stroke="{GREEN}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></g>'''),
  "costlivingdex": ("CostLivingDex", f'''
  <path d="M110 148 H156 L194 316 H352 L384 196 H174" fill="none" stroke="{INK}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="214" cy="364" r="22" fill="{INK}"/><circle cx="332" cy="364" r="22" fill="{INK}"/>
  <polyline points="214,282 256,248 288,264 336,222" fill="none" stroke="{GREEN}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>'''),
  "povertydex": ("PovertyDex", f'''
  <g fill="{INK}"><rect x="132" y="132" width="70" height="70" rx="14"/><rect x="221" y="132" width="70" height="70" rx="14"/><rect x="310" y="132" width="70" height="70" rx="14"/>
  <rect x="132" y="221" width="70" height="70" rx="14"/><rect x="310" y="221" width="70" height="70" rx="14"/>
  <rect x="132" y="310" width="70" height="70" rx="14"/><rect x="221" y="310" width="70" height="70" rx="14"/><rect x="310" y="310" width="70" height="70" rx="14"/></g>
  <rect x="221" y="221" width="70" height="70" rx="14" fill="{GREEN}" filter="url(#glow)"/>'''),
  "populationdex": ("PopulationDex", f'''
  <circle cx="256" cy="176" r="40" fill="{INK}"/><path d="M188 312 C188 262 220 236 256 236 C292 236 324 262 324 312 Z" fill="{INK}"/>
  <circle cx="154" cy="214" r="30" fill="{INK}" fill-opacity="0.75"/><path d="M104 324 C104 284 126 264 154 264 C182 264 204 284 204 324 Z" fill="{INK}" fill-opacity="0.75"/>
  <circle cx="358" cy="214" r="30" fill="{GREEN}" filter="url(#glow)"/><path d="M308 324 C308 284 330 264 358 264 C386 264 408 284 408 324 Z" fill="{GREEN}" filter="url(#glow)"/>
  <rect x="112" y="356" width="288" height="14" rx="7" fill="{INK}" fill-opacity="0.35"/>'''),
  "homelessnessdex": ("HomelessnessDex", f'''
  <rect x="140" y="152" width="232" height="214" rx="18" fill="none" stroke="{INK}" stroke-width="20"/>
  <g fill="{INK}"><rect x="170" y="186" width="172" height="16" rx="8"/><rect x="170" y="218" width="120" height="12" rx="6" fill-opacity="0.6"/></g>
  <path d="M256 338 C256 338 196 300 196 268 C196 250 210 238 226 238 C240 238 250 246 256 256 C262 246 272 238 286 238 C302 238 316 250 316 268 C316 300 256 338 256 338 Z" fill="{GREEN}" filter="url(#glow)"/>'''),
  "housingdex": ("HousingDex", f'''
  <rect x="120" y="140" width="272" height="232" rx="20" fill="none" stroke="{INK}" stroke-width="20"/>
  <g fill="{INK}"><rect x="148" y="172" width="216" height="18" rx="9"/><rect x="148" y="206" width="96" height="10" rx="5" fill-opacity="0.6"/><rect x="148" y="228" width="96" height="10" rx="5" fill-opacity="0.6"/><rect x="148" y="250" width="96" height="10" rx="5" fill-opacity="0.6"/></g>
  <polygon points="312,212 362,252 350,252 350,338 274,338 274,252 262,252" fill="{GREEN}" filter="url(#glow)"/>'''),
  "mylaiwyer": ("My LAIwyer", f'''
  <rect x="246" y="132" width="20" height="236" rx="8" fill="{INK}"/>
  <rect x="176" y="368" width="160" height="22" rx="10" fill="{INK}"/>
  <rect x="136" y="160" width="240" height="16" rx="8" fill="{INK}"/>
  <circle cx="256" cy="128" r="18" fill="{INK}"/>
  <g stroke="{INK}" stroke-width="6"><line x1="150" y1="176" x2="116" y2="268"/><line x1="150" y1="176" x2="184" y2="268"/><line x1="362" y1="176" x2="328" y2="268"/><line x1="362" y1="176" x2="396" y2="268"/></g>
  <path d="M104 268 H196 A46 46 0 0 1 104 268 Z" fill="{INK}"/>
  <path d="M316 268 H408 A46 46 0 0 1 316 268 Z" fill="{GREEN}" filter="url(#glow)"/>
  <path d="M352 96 l7 17 17 7 -17 7 -7 17 -7 -17 -17 -7 17 -7 Z" fill="#FFFFFF"/>'''),
  "vcdex": ("VCDex", f'''
  <ellipse cx="256" cy="352" rx="120" ry="34" fill="{INK}"/>
  <rect x="136" y="318" width="240" height="34" fill="{INK}"/>
  <ellipse cx="256" cy="318" rx="120" ry="34" fill="#DCE3DE"/>
  <line x1="256" y1="318" x2="256" y2="196" stroke="{GREEN}" stroke-width="16" stroke-linecap="round" filter="url(#glow)"/>
  <path d="M256 236 C206 236 182 204 180 160 C226 160 254 186 256 236 Z" fill="{GREEN}" filter="url(#glow)"/>
  <path d="M256 210 C298 210 326 184 330 140 C288 140 260 162 256 210 Z" fill="{GREEN}" filter="url(#glow)"/>'''),
}

for key, (title, inner) in ICONS.items():
    with open(os.path.join(OUT, f"{key}.svg"), "w") as f:
        f.write(tile(inner, title))

async def render():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(device_scale_factor=1)
        for key in ICONS:
            svg = open(os.path.join(OUT, f"{key}.svg")).read()
            for size in (1024, 512, 192):
                await pg.set_viewport_size({"width": size, "height": size})
                await pg.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("width=\"512\" height=\"512\"", f"width=\"{size}\" height=\"{size}\"")}</body></html>')
                await pg.locator("svg").screenshot(path=os.path.join(OUT, f"{key}-{size}.png"), omit_background=True)
        # contact sheet
        cells = "".join(f'<figure><div class="i">{open(os.path.join(OUT, k + ".svg")).read()}</div><figcaption>{t}</figcaption></figure>' for k, (t, _) in ICONS.items())
        html = f'''<html><head><style>body{{margin:0;background:#0A0F0C;font-family:Inter,Helvetica,Arial,sans-serif;color:#EEF3EF}}
        .g{{display:grid;grid-template-columns:repeat(7,180px);gap:28px;padding:36px}} figure{{margin:0;text-align:center}}
        .i svg{{width:168px;height:168px}} figcaption{{margin-top:10px;font-size:18px;letter-spacing:.02em}}
        .light{{background:#F4F6F5;color:#0A0F0C}}</style></head><body><div class="g">{cells}</div></body></html>'''
        await pg.set_viewport_size({"width": 1500, "height": 1000})
        await pg.set_content(html)
        await pg.screenshot(path=os.path.join(OUT, "_family_preview.png"), full_page=True)
        await b.close()

asyncio.run(render())
print("ok", list(ICONS))
