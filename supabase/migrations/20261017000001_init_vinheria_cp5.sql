-- ============================================================================
-- CHECK POINT 5 - MONITORAMENTO GLOBAL DE VINHERIAS (SUPABASE POSTGRESQL)
-- Tabelas: vine_devices, vine_trigger_configs, vine_telemetry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vine_devices (
    device_id TEXT PRIMARY KEY,
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'Vine',
    api_key TEXT NOT NULL DEFAULT 'TEF',
    transport TEXT NOT NULL DEFAULT 'MQTT',
    wokwi_project_url TEXT DEFAULT 'https://wokwi.com/projects/478106752109243393',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vine_trigger_configs (
    preset_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    temp_min NUMERIC(5,2) NOT NULL,
    temp_max NUMERIC(5,2) NOT NULL,
    hum_min NUMERIC(5,2) NOT NULL,
    hum_max NUMERIC(5,2) NOT NULL,
    lum_min NUMERIC(5,2) NOT NULL,
    lum_max NUMERIC(5,2) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vine_telemetry (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES public.vine_devices(device_id) ON DELETE CASCADE,
    temperature NUMERIC(5,2) NOT NULL CHECK (temperature BETWEEN -40.0 AND 80.0),
    humidity NUMERIC(5,2) NOT NULL CHECK (humidity BETWEEN 0.0 AND 100.0),
    luminosity NUMERIC(5,2) NOT NULL CHECK (luminosity BETWEEN 0.0 AND 100.0),
    alert_mode TEXT NOT NULL DEFAULT 'normal',
    cellar_health_score INTEGER NOT NULL DEFAULT 100,
    source TEXT NOT NULL DEFAULT 'Wokwi MQTT / FIWARE',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vine_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vine_trigger_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vine_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on vine_devices" ON public.vine_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on vine_trigger_configs" ON public.vine_trigger_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on vine_telemetry" ON public.vine_telemetry FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.vine_devices (device_id, entity_name, entity_type, api_key, transport, wokwi_project_url)
VALUES ('vine001', 'urn:ngsi-ld:Vine:001', 'Vine', 'TEF', 'MQTT', 'https://wokwi.com/projects/478106752109243393')
ON CONFLICT (device_id) DO NOTHING;

INSERT INTO public.vine_trigger_configs (preset_key, name, description, temp_min, temp_max, hum_min, hum_max, lum_min, lum_max)
VALUES
    ('tinto', 'Vinho Tinto Encorpado', 'Faixa ideal para maturacao de tintos (Cabernet, Malbec, Tannat).', 14.0, 18.0, 60.0, 75.0, 0.0, 25.0),
    ('branco', 'Vinho Branco & Rose', 'Refrigeracao controlada para preservacao de acidez e aromas florais.', 8.0, 12.0, 60.0, 75.0, 0.0, 20.0),
    ('espumante', 'Espumante & Champagne', 'Baixa temperatura e alta protecao luminosa para preservar o perlage.', 6.0, 9.0, 65.0, 80.0, 0.0, 15.0),
    ('envelhecimento', 'Cave de Envelhecimento (Guarda)', 'Estabilidade termica rigorosa e escuridao para protecao da rolha.', 12.0, 15.0, 65.0, 75.0, 0.0, 10.0)
ON CONFLICT (preset_key) DO NOTHING;
