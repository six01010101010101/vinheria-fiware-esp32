/**
 * Catálogo Canônico de Lotes da Cava, Presets Enológicos e Terroirs Globais — Vinheria Agnello
 */
(function () {
  const CANONICAL_LOTS = [
    { code: "LOTE-FR-MARGAUX-01", winery: "Château Margaux", wine: "Premier Grand Cru Classé", style: "tinto", styleLabel: "🍷 Tinto", terroirId: "fr_margaux", country: "França", flag: "🇫🇷", region: "Médoc, Bordeaux", vintage: 2015, bottling: "2017-08", barrel: "Carvalho Francês Allier (24m)", soil: "Cascalho Günziense & Calcário", apogee: "2025–2045", liveT: 15.2, liveH: 71.0, liveL: 9.0, temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 20.0 },
    { code: "LOTE-FR-BLANC-04", winery: "Château Margaux", wine: "Pavillon Blanc Sauvignon", style: "branco", styleLabel: "🥂 Branco", terroirId: "fr_margaux", country: "França", flag: "🇫🇷", region: "Bordeaux", vintage: 2020, bottling: "2021-06", barrel: "Carvalho Francês Neutro (8m)", soil: "Argilo-Calcário Fino", apogee: "2023–2033", liveT: 10.1, liveH: 67.0, liveL: 8.0, temp: [8.0, 12.0], hum: [60.0, 75.0], lum: 15.0 },
    { code: "LOTE-FR-ROSE-10", winery: "Château Margaux", wine: "Pavillon Rosé de Margaux", style: "rose", styleLabel: "🌸 Rosé", terroirId: "fr_margaux", country: "França", flag: "🇫🇷", region: "Médoc, Bordeaux", vintage: 2022, bottling: "2023-04", barrel: "Carvalho Neutro & Inox (6m)", soil: "Cascalho Aluvial", apogee: "2024–2029", liveT: 11.4, liveH: 66.0, liveL: 7.0, temp: [10.0, 13.0], hum: [60.0, 75.0], lum: 12.0 },
    { code: "LOTE-RU-ABRAU-09", winery: "Abrau-Durso", wine: "Imperial Brut Cuvée", style: "espumante", styleLabel: "🍾 Brut", terroirId: "ru_abrau", country: "Rússia", flag: "🇷🇺", region: "Mar Negro / Krasnodar", vintage: 2018, bottling: "2019-06", barrel: "Túneis Subterrâneos (36m)", soil: "Calcário Puro Fóssil", apogee: "2023–2031", liveT: 7.4, liveH: 73.0, liveL: 5.0, temp: [6.0, 9.0], hum: [65.0, 80.0], lum: 10.0 },
    { code: "LOTE-IT-ANTINORI-02", winery: "Marchesi Antinori", wine: "Tignanello IGT Toscana", style: "tinto", styleLabel: "🍷 Tinto", terroirId: "it_antinori", country: "Itália", flag: "🇮🇹", region: "Chianti Classico", vintage: 2016, bottling: "2018-09", barrel: "Barricas Allier (16m)", soil: "Galestro & Alberese", apogee: "2023–2038", liveT: 17.6, liveH: 61.0, liveL: 14.0, temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 20.0 },
    { code: "LOTE-IT-CERVARO-05", winery: "Marchesi Antinori", wine: "Cervaro della Sala Chardonnay", style: "branco", styleLabel: "🥂 Branco", terroirId: "it_antinori", country: "Itália", flag: "🇮🇹", region: "Úmbria / Toscana", vintage: 2021, bottling: "2022-04", barrel: "Barricas Francesas (5m)", soil: "Calcário com Fósseis", apogee: "2024–2032", liveT: 12.6, liveH: 59.0, liveL: 11.0, temp: [8.0, 12.0], hum: [60.0, 75.0], lum: 15.0 },
    { code: "LOTE-PT-CRASTO-06", winery: "Quinta do Crasto", wine: "Crasto Vinha Maria Teresa", style: "tinto", styleLabel: "🍷 Tinto", terroirId: "pt_crasto", country: "Portugal", flag: "🇵🇹", region: "Vale do Douro", vintage: 2017, bottling: "2019-10", barrel: "Carvalho Francês 225L (20m)", soil: "Xisto Pré-Cambriano", apogee: "2026–2042", liveT: 15.8, liveH: 69.0, liveL: 9.0, temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 20.0 },
    { code: "LOTE-AR-CATENA-07", winery: "Catena Zapata", wine: "Nicolás Catena Malbec", style: "tinto", styleLabel: "🍷 Tinto", terroirId: "ar_catena", country: "Argentina", flag: "🇦🇷", region: "Gualtallary, Mendoza", vintage: 2018, bottling: "2020-05", barrel: "Carvalho 1º Uso (18m)", soil: "Aluvial Andino", apogee: "2025–2040", liveT: 21.8, liveH: 48.0, liveL: 29.0, temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 20.0 }
  ];

  const PRESETS = {
    tinto: { key: "tinto", name: "Vinho Tinto", badge: "🍷 TINTO GRAND CRU", casta: "Cabernet Sauvignon · Merlot · Malbec", wine: "Château Margaux 2015", defaultLot: "LOTE-FR-MARGAUX-01", color: "#ef4444", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25, defT: 15.2, defH: 71, defL: 9, desc: "Maturação de tintos encorpados (14–18°C | 60–75% UR | ≤25% Luz): polimerização de taninos e evolução nobre." },
    branco: { key: "branco", name: "Vinho Branco", badge: "🥂 BRANCO RESERVA", casta: "Chardonnay · Sauvignon Blanc", wine: "Pavillon Blanc de Margaux 2020", defaultLot: "LOTE-FR-BLANC-04", color: "#eab308", tMin: 8, tMax: 12, hMin: 60, hMax: 75, lMin: 0, lMax: 15, defT: 10.1, defH: 67, defL: 8, desc: "Preservação de brancos aromáticos (8–12°C | 60–75% UR | ≤15% Luz): frescor cítrico, acidez viva e proteção UV." },
    rose: { key: "rose", name: "Vinho Rosé", badge: "🌸 ROSÉ DE PROVENCE", casta: "Pinot Noir Rosé · Grenache · Syrah", wine: "Pavillon Rosé de Margaux 2022", defaultLot: "LOTE-FR-ROSE-10", color: "#ec4899", tMin: 10, tMax: 13, hMin: 60, hMax: 75, lMin: 0, lMax: 12, defT: 11.4, defH: 66, defL: 7, desc: "Conservação de rosés finos (10–13°C | 60–75% UR | ≤12% Luz): notas florais intactas e penumbra rigorosa." },
    espumante: { key: "espumante", name: "Champanhe / Brut", badge: "🍾 ESPUMANTE BRUT", casta: "Chardonnay · Pinot Noir (Método Tradicional)", wine: "Abrau-Durso Imperial Brut 2018", defaultLot: "LOTE-RU-ABRAU-09", color: "#38bdf8", tMin: 6, tMax: 9, hMin: 65, hMax: 80, lMin: 0, lMax: 10, defT: 7.4, defH: 73, defL: 5, desc: "Guarda de espumantes Brut (6–9°C | 65–80% UR | ≤10% Luz): pressão interna de CO₂, perlage fino e rolha elástica." }
  };

  const TERROIRS = {
    wokwi_esp32: { id: "wokwi_esp32", name: "ESP32 Wokwi", reg: "HiveMQ :1883", flag: "📟", country: "Wokwi", lat: 0, lon: 0, t: 15.2, h: 71, l: 9 },
    it_antinori: { id: "it_antinori", name: "Marchesi Antinori", reg: "Toscana", flag: "🇮🇹", country: "Itália", lat: 43.6158, lon: 11.2136, t: 16.5, h: 62, l: 14 },
    fr_margaux: { id: "fr_margaux", name: "Château Margaux", reg: "Bordeaux", flag: "🇫🇷", country: "França", lat: 45.0444, lon: -0.6686, t: 14.8, h: 72, l: 10 },
    br_miolo: { id: "br_miolo", name: "Vinícola Miolo", reg: "Serra Gaúcha", flag: "🇧🇷", country: "Brasil", lat: -29.1864, lon: -51.5567, t: 18.6, h: 76, l: 16 },
    us_opus: { id: "us_opus", name: "Opus One", reg: "Napa Valley", flag: "🇺🇸", country: "EUA", lat: 38.4367, lon: -122.4017, t: 17.5, h: 58, l: 20 },
    ru_abrau: { id: "ru_abrau", name: "Abrau-Durso", reg: "Mar Negro", flag: "🇷🇺", country: "Rússia", lat: 44.7000, lon: 37.6000, t: 7.8, h: 74, l: 6 },
    ar_catena: { id: "ar_catena", name: "Catena Zapata", reg: "Mendoza", flag: "🇦🇷", country: "Argentina", lat: -33.1667, lon: -68.9167, t: 21.8, h: 48, l: 29 },
    cl_concha: { id: "cl_concha", name: "Concha y Toro", reg: "Vale do Maipo", flag: "🇨🇱", country: "Chile", lat: -33.6433, lon: -70.5789, t: 15.8, h: 60, l: 18 },
    pt_crasto: { id: "pt_crasto", name: "Quinta do Crasto", reg: "Vale do Douro", flag: "🇵🇹", country: "Portugal", lat: 41.1681, lon: -7.6308, t: 15.9, h: 68, l: 11 }
  };

  window.CANONICAL_LOTS = CANONICAL_LOTS;
  window.PRESETS = PRESETS;
  window.TERROIRS = TERROIRS;
})();
