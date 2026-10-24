/**
 * Catálogo Canônico de Lotes da Cava, Presets Enológicos e Terroirs Globais — Vinheria Agnello
 */
const CANONICAL_LOTS = [
  { code: "LOTE-FR-MARGAUX-01", winery: "Château Margaux", wine: "Premier Grand Cru Classé", style: "tinto", country: "França", region: "Médoc, Bordeaux", vintage: 2015, bottling: "2017-08", barrel: "Carvalho Francês Allier (24m)", soil: "Cascalho Günziense & Calcário", apogee: "2025–2045", health: 100, verdict: "Equilíbrio Ideal", temp: [13.0, 16.0], hum: [70.0, 80.0], lum: 10.0 },
  { code: "LOTE-IT-ANTINORI-02", winery: "Marchesi Antinori", wine: "Tignanello IGT Toscana", style: "tinto", country: "Itália", region: "Chianti Classico", vintage: 2016, bottling: "2018-09", barrel: "Barricas Troncais & Allier (16m)", soil: "Galestro (Xisto) & Alberese", apogee: "2023–2038", health: 100, verdict: "Afinamento Nobre", temp: [13.0, 16.5], hum: [68.0, 78.0], lum: 10.0 },
  { code: "LOTE-BR-MIOLO-43", winery: "Vinícola Miolo", wine: "Lote 43 Merlot / Cabernet", style: "tinto", country: "Brasil", region: "Vale dos Vinhedos (RS)", vintage: 2018, bottling: "2020-03", barrel: "Carvalho Francês Novo (12m)", soil: "Basáltico-Argiloso", apogee: "2024–2032", health: 98, verdict: "Taninos Macios", temp: [13.5, 16.5], hum: [65.0, 78.0], lum: 12.0 },
  { code: "LOTE-FR-BLANC-04", winery: "Château Margaux", wine: "Pavillon Blanc de Margaux", style: "branco", country: "França", region: "Bordeaux", vintage: 2020, bottling: "2021-06", barrel: "Carvalho Francês Neutro (8m)", soil: "Argilo-Calcário Fino", apogee: "2023–2033", health: 96, verdict: "Acidez e Pureza", temp: [9.0, 12.5], hum: [60.0, 72.0], lum: 12.0 },
  { code: "LOTE-IT-CERVARO-05", winery: "Marchesi Antinori", wine: "Cervaro della Sala IGT", style: "branco", country: "Itália", region: "Úmbria / Toscana", vintage: 2021, bottling: "2022-04", barrel: "Barricas Francesas e Inox (5m)", soil: "Calcário com Fósseis", apogee: "2024–2032", health: 97, verdict: "Mineralidade e Frescor", temp: [9.5, 13.0], hum: [62.0, 75.0], lum: 10.0 },
  { code: "LOTE-FR-ROSE-10", winery: "Château Margaux", wine: "Pavillon Rosé de Margaux", style: "rose", country: "França", region: "Médoc, Bordeaux", vintage: 2022, bottling: "2023-04", barrel: "Carvalho Neutro (6m)", soil: "Cascalho Aluvial", apogee: "2023–2027", health: 99, verdict: "Frescor Silvestre", temp: [10.0, 13.0], hum: [60.0, 75.0], lum: 10.0 },
  { code: "LOTE-RU-ABRAU-09", winery: "Abrau-Durso", wine: "Imperial Brut Imperial", style: "espumante", country: "Rússia", region: "Mar Negro / Krasnodar", vintage: 2018, bottling: "2019-06", barrel: "Túneis Subterrâneos (36m)", soil: "Calcário Puro Fóssil", apogee: "2023–2031", health: 100, verdict: "Perlage Fino e Cremoso", temp: [6.0, 9.0], hum: [70.0, 85.0], lum: 5.0 },
  { code: "LOTE-BR-EPICO-08", winery: "Villa Francioni", wine: "VF Épico Brut Tradicional", style: "espumante", country: "Brasil", region: "São Joaquim (1280m)", vintage: 2018, bottling: "2019-02", barrel: "Pupitres (36m sur lie)", soil: "Vulcânico Pedregoso", apogee: "2022–2030", health: 100, verdict: "Perlage Cremoso", temp: [6.5, 10.0], hum: [72.0, 85.0], lum: 5.0 },
  { code: "LOTE-PT-CRASTO-06", winery: "Quinta do Crasto", wine: "Crasto Vinha Maria Teresa", style: "tinto", country: "Portugal", region: "Vale do Douro", vintage: 2017, bottling: "2019-10", barrel: "Carvalho Francês 225L (20m)", soil: "Xisto Pré-Cambriano", apogee: "2026–2042", health: 100, verdict: "Potencial Notável", temp: [13.0, 16.0], hum: [68.0, 78.0], lum: 8.0 },
  { code: "LOTE-AR-CATENA-07", winery: "Catena Zapata", wine: "Nicolás Catena Zapata", style: "tinto", country: "Argentina", region: "Gualtallary, Mendoza", vintage: 2018, bottling: "2020-05", barrel: "Carvalho 1º Uso (18m)", soil: "Aluvial Andino", apogee: "2025–2040", health: 100, verdict: "Estrutura Andina", temp: [12.5, 16.0], hum: [65.0, 75.0], lum: 10.0 }
];

const PRESETS = {
  tinto: { name: "Vinho Tinto", wine: "Château Margaux 2015", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25, defT: 15.6, defH: 68, defL: 12, desc: "Maturação de tintos (14-18°C / 60-75%): taninos estáveis e oxidação lenta." },
  branco: { name: "Vinho Branco", wine: "Pavillon Blanc 2020", tMin: 8, tMax: 12, hMin: 60, hMax: 75, lMin: 0, lMax: 15, defT: 10.2, defH: 67, defL: 8, desc: "Preservação de brancos (8-12°C / 60-75%): frescor, acidez e penumbra." },
  rose: { name: "Vinho Rosé", wine: "Pavillon Rosé 2022", tMin: 10, tMax: 13, hMin: 60, hMax: 75, lMin: 0, lMax: 12, defT: 11.4, defH: 66, defL: 7, desc: "Conservação de rosés (10-13°C / 60-75%): frescor aromático e proteção lumínica." },
  espumante: { name: "Champanhe / Brut", wine: "Dom Pérignon Brut 2019", tMin: 6, tMax: 9, hMin: 65, hMax: 80, lMin: 0, lMax: 10, defT: 7.4, defH: 72, defL: 5, desc: "Guarda de espumantes (6-9°C / 65-80%): pressão de CO2 e perlage fino." }
};

const TERROIRS = {
  wokwi_esp32: { id: "wokwi_esp32", name: "ESP32 Wokwi", reg: "HiveMQ :1883", flag: "📟", country: "Wokwi", lat: 0, lon: 0, t: 15.5, h: 68, l: 12 },
  it_antinori: { id: "it_antinori", name: "Marchesi Antinori", reg: "Toscana", flag: "🇮🇹", country: "Itália", lat: 43.61, lon: 11.21, t: 16.5, h: 62, l: 14 },
  fr_margaux: { id: "fr_margaux", name: "Château Margaux", reg: "Bordeaux", flag: "🇫🇷", country: "França", lat: 45.04, lon: -0.66, t: 14.8, h: 72, l: 11 },
  br_miolo: { id: "br_miolo", name: "Vinícola Miolo", reg: "Serra Gaúcha", flag: "🇧🇷", country: "Brasil", lat: -29.18, lon: -51.55, t: 15.2, h: 76, l: 16 },
  us_opus: { id: "us_opus", name: "Opus One", reg: "Napa Valley", flag: "🇺🇸", country: "EUA", lat: 38.43, lon: -122.40, t: 17.5, h: 58, l: 20 },
  ru_abrau: { id: "ru_abrau", name: "Abrau-Durso", reg: "Mar Negro", flag: "🇷🇺", country: "Rússia", lat: 44.70, lon: 37.60, t: 11.4, h: 70, l: 9 },
  ar_catena: { id: "ar_catena", name: "Catena Zapata", reg: "Mendoza", flag: "🇦🇷", country: "Argentina", lat: -33.16, lon: -68.91, t: 16.2, h: 52, l: 22 },
  cl_concha: { id: "cl_concha", name: "Concha y Toro", reg: "Vale do Maipo", flag: "🇨🇱", country: "Chile", lat: -33.64, lon: -70.57, t: 15.8, h: 60, l: 18 },
  pt_crasto: { id: "pt_crasto", name: "Quinta do Crasto", reg: "Vale do Douro", flag: "🇵🇹", country: "Portugal", lat: 41.16, lon: -7.63, t: 17.0, h: 65, l: 13 }
};

window.CANONICAL_LOTS = CANONICAL_LOTS;
window.PRESETS = PRESETS;
window.TERROIRS = TERROIRS;
