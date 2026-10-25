/**
 * Catálogo Canônico de Lotes da Cava, Presets Enológicos e Terroirs Globais — Vinheria Agnello
 */
(function () {
  const CANONICAL_LOTS = [
    { code: "LOTE-FR-MARGAUX-01", winery: "Château Margaux", wine: "Premier Grand Cru Classé", style: "tinto", styleLabel: "🍷 Tinto", terroirId: "fr_margaux", country: "França", flag: "🇫🇷", region: "Médoc, Bordeaux", vintage: 2015, barrel: "Carvalho Francês Allier (24m)", soil: "Cascalho & Calcário", apogee: "2025–2045", liveT: 15.2, liveH: 71.0, liveL: 9.0, temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 25.0 },
    { code: "LOTE-FR-BLANC-02", winery: "Château Margaux", wine: "Pavillon Blanc Sauvignon", style: "branco", styleLabel: "🥂 Branco", terroirId: "it_antinori", country: "Itália / França", flag: "🥂", region: "Bordeaux / Toscana", vintage: 2020, barrel: "Carvalho Francês Neutro (8m)", soil: "Argilo-Calcário Fino", apogee: "2024–2033", liveT: 10.1, liveH: 67.0, liveL: 8.0, temp: [8.0, 12.0], hum: [60.0, 75.0], lum: 15.0 },
    { code: "LOTE-FR-ROSE-03", winery: "Domaine Ott", wine: "Château de Selle Rosé", style: "rose", styleLabel: "🌸 Rosé", terroirId: "cl_concha", country: "França / Chile", flag: "🌸", region: "Provence / Maipo", vintage: 2022, barrel: "Inox & Carvalho Neutro (6m)", soil: "Calcário & Xisto", apogee: "2024–2029", liveT: 11.4, liveH: 66.0, liveL: 7.0, temp: [10.0, 13.0], hum: [60.0, 75.0], lum: 12.0 },
    { code: "LOTE-RU-ABRAU-04", winery: "Abrau-Durso", wine: "Imperial Brut Vintage", style: "espumante", styleLabel: "🍾 Brut", terroirId: "ru_abrau", country: "Rússia", flag: "🇷🇺", region: "Mar Negro / Krasnodar", vintage: 2018, barrel: "Túneis Subterrâneos (36m)", soil: "Calcário Fóssil", apogee: "2023–2031", liveT: 7.4, liveH: 73.0, liveL: 5.0, temp: [6.0, 9.0], hum: [65.0, 80.0], lum: 10.0 },
    { code: "LOTE-PT-CRASTO-05", winery: "Quinta do Crasto", wine: "Vinha Maria Teresa Reserva", style: "tinto", styleLabel: "🍷 Tinto", terroirId: "pt_crasto", country: "Portugal", flag: "🇵🇹", region: "Vale do Douro", vintage: 2017, barrel: "Carvalho Francês (20m)", soil: "Xisto Pré-Cambriano", apogee: "2026–2042", liveT: 17.6, liveH: 61.0, liveL: 14.0, temp: [14.0, 18.0], hum: [60.0, 75.0], lum: 25.0 },
    { code: "LOTE-IT-CERVARO-06", winery: "Marchesi Antinori", wine: "Cervaro della Sala Chardonnay", style: "branco", styleLabel: "🥂 Branco", terroirId: "us_opus", country: "Itália / EUA", flag: "🇮🇹", region: "Úmbria / Napa", vintage: 2021, barrel: "Barricas Allier (5m)", soil: "Calcário Marinho", apogee: "2024–2032", liveT: 11.7, liveH: 61.0, liveL: 12.0, temp: [8.0, 12.0], hum: [60.0, 75.0], lum: 15.0 },
    { code: "LOTE-BR-MIOLO-07", winery: "Vinícola Miolo", wine: "Cuvée Giuseppe Rosé", style: "rose", styleLabel: "🌸 Rosé", terroirId: "br_miolo", country: "Brasil", flag: "🇧🇷", region: "Vale dos Vinhedos (RS)", vintage: 2022, barrel: "Inox Climatizado (6m)", soil: "Basáltico-Argiloso", apogee: "2024–2028", liveT: 14.8, liveH: 57.0, liveL: 16.0, temp: [10.0, 13.0], hum: [60.0, 75.0], lum: 12.0 },
    { code: "LOTE-AR-CATENA-08", winery: "Catena Zapata", wine: "Nicolás Catena Brut / Malbec", style: "espumante", styleLabel: "🍾 Brut", terroirId: "ar_catena", country: "Argentina", flag: "🇦🇷", region: "Gualtallary, Mendoza", vintage: 2018, barrel: "Pupitres Andinos (24m)", soil: "Aluvial Andino", apogee: "2025–2036", liveT: 14.9, liveH: 48.0, liveL: 24.0, temp: [6.0, 9.0], hum: [65.0, 80.0], lum: 10.0 }
  ];

  const PRESETS = {
    tinto: { key: "tinto", name: "Vinho Tinto", badge: "🍷 TINTO GRAND CRU", casta: "Cabernet Sauvignon · Merlot · Touriga", wine: "Château Margaux 2015", defaultLot: "LOTE-FR-MARGAUX-01", defaultTerroir: "fr_margaux", color: "#ef4444", tMin: 14, tMax: 18, hMin: 60, hMax: 75, lMin: 0, lMax: 25, defT: 15.2, defH: 71, defL: 9, desc: "Maturação de tintos encorpados (14–18°C | 60–75% UR | ≤25% Luz): polimerização de taninos e evolução nobre." },
    branco: { key: "branco", name: "Vinho Branco", badge: "🥂 BRANCO RESERVA", casta: "Chardonnay · Sauvignon Blanc", wine: "Pavillon Blanc Sauvignon 2020", defaultLot: "LOTE-FR-BLANC-02", defaultTerroir: "it_antinori", color: "#eab308", tMin: 8, tMax: 12, hMin: 60, hMax: 75, lMin: 0, lMax: 15, defT: 10.1, defH: 67, defL: 8, desc: "Preservação de brancos aromáticos (8–12°C | 60–75% UR | ≤15% Luz): frescor cítrico, acidez viva e proteção UV." },
    rose: { key: "rose", name: "Vinho Rosé", badge: "🌸 ROSÉ DE PROVENCE", casta: "Pinot Noir Rosé · Grenache · Syrah", wine: "Domaine Ott Rosé 2022", defaultLot: "LOTE-FR-ROSE-03", defaultTerroir: "cl_concha", color: "#ec4899", tMin: 10, tMax: 13, hMin: 60, hMax: 75, lMin: 0, lMax: 12, defT: 11.4, defH: 66, defL: 7, desc: "Conservação de rosés finos (10–13°C | 60–75% UR | ≤12% Luz): notas florais intactas e penumbra rigorosa." },
    espumante: { key: "espumante", name: "Champanhe / Brut", badge: "🍾 ESPUMANTE BRUT", casta: "Chardonnay · Pinot Noir (Método Tradicional)", wine: "Abrau-Durso Imperial Brut 2018", defaultLot: "LOTE-RU-ABRAU-04", defaultTerroir: "ru_abrau", color: "#38bdf8", tMin: 6, tMax: 9, hMin: 65, hMax: 80, lMin: 0, lMax: 10, defT: 7.4, defH: 73, defL: 5, desc: "Guarda de espumantes Brut (6–9°C | 65–80% UR | ≤10% Luz): pressão interna de CO₂, perlage fino e rolha elástica." }
  };

  const TERROIRS = {
    fr_margaux: { id: "fr_margaux", name: "Château Margaux", reg: "Bordeaux", flag: "🇫🇷", country: "França", lat: 45.0444, lon: -0.6686, t: 15.2, h: 71, l: 9 },
    it_antinori: { id: "it_antinori", name: "Marchesi Antinori", reg: "Toscana", flag: "🇮🇹", country: "Itália", lat: 43.6158, lon: 11.2136, t: 10.4, h: 67, l: 8 },
    cl_concha: { id: "cl_concha", name: "Concha y Toro", reg: "Vale do Maipo", flag: "🇨🇱", country: "Chile", lat: -33.6433, lon: -70.5789, t: 11.5, h: 66, l: 7 },
    ru_abrau: { id: "ru_abrau", name: "Abrau-Durso", reg: "Mar Negro", flag: "🇷🇺", country: "Rússia", lat: 44.7000, lon: 37.6000, t: 7.5, h: 73, l: 5 },
    pt_crasto: { id: "pt_crasto", name: "Quinta do Crasto", reg: "Vale do Douro", flag: "🇵🇹", country: "Portugal", lat: 41.1681, lon: -7.6308, t: 16.4, h: 65, l: 11 },
    us_opus: { id: "us_opus", name: "Opus One", reg: "Napa Valley", flag: "🇺🇸", country: "EUA", lat: 38.4367, lon: -122.4017, t: 13.2, h: 61, l: 12 },
    br_miolo: { id: "br_miolo", name: "Vinícola Miolo", reg: "Serra Gaúcha", flag: "🇧🇷", country: "Brasil", lat: -29.1864, lon: -51.5567, t: 18.2, h: 74, l: 15 },
    ar_catena: { id: "ar_catena", name: "Catena Zapata", reg: "Mendoza", flag: "🇦🇷", country: "Argentina", lat: -33.1667, lon: -68.9167, t: 21.6, h: 49, l: 26 },
    wokwi_esp32: { id: "wokwi_esp32", name: "ESP32 Wokwi", reg: "HiveMQ :1883", flag: "📟", country: "Wokwi", lat: 0, lon: 0, t: 15.2, h: 71, l: 9 }
  };

  window.CANONICAL_LOTS = CANONICAL_LOTS;
  window.PRESETS = PRESETS;
  window.TERROIRS = TERROIRS;
})();
