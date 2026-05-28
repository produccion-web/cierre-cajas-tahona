-- ============================================================
--  ESQUEMA SUPABASE — CIERRES DE CAJA v2
--  Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Elimina tablas anteriores si existían
DROP TABLE IF EXISTS pagos_proveedor CASCADE;
DROP TABLE IF EXISTS cierres_caja CASCADE;

-- Tabla principal de cierres (un cierre diario agrupa ambos TPVs)
CREATE TABLE cierres_caja (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                DATE NOT NULL DEFAULT CURRENT_DATE,
  turno                TEXT NOT NULL CHECK (turno IN ('mañana', 'tarde', 'completo')),

  -- Fondo de apertura
  fondo_apertura       NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Ventas TPV1
  tpv1_efectivo        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tpv1_tarjeta         NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Ventas TPV2
  tpv2_efectivo        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tpv2_tarjeta         NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Pagos a proveedores en efectivo (suma; detalle en pagos_proveedor)
  pagos_proveedor      NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Retirada de efectivo al cierre
  retirada_efectivo    NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Columnas calculadas
  total_efectivo_ventas NUMERIC(10,2) GENERATED ALWAYS AS (tpv1_efectivo + tpv2_efectivo) STORED,
  total_tarjeta         NUMERIC(10,2) GENERATED ALWAYS AS (tpv1_tarjeta + tpv2_tarjeta) STORED,
  efectivo_en_caja      NUMERIC(10,2) GENERATED ALWAYS AS (fondo_apertura + tpv1_efectivo + tpv2_efectivo - pagos_proveedor) STORED,
  fondo_siguiente_dia   NUMERIC(10,2) GENERATED ALWAYS AS (fondo_apertura + tpv1_efectivo + tpv2_efectivo - pagos_proveedor - retirada_efectivo) STORED,
  total_ventas          NUMERIC(10,2) GENERATED ALWAYS AS (tpv1_efectivo + tpv2_efectivo + tpv1_tarjeta + tpv2_tarjeta) STORED,

  notas                TEXT,
  cerrado_por          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (fecha, turno)
);

-- Detalle de pagos a proveedores
CREATE TABLE pagos_proveedor (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id  UUID REFERENCES cierres_caja(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto   TEXT NOT NULL,
  importe    NUMERIC(10,2) NOT NULL CHECK (importe > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_cierres_fecha ON cierres_caja(fecha DESC);
CREATE INDEX idx_pagos_cierre  ON pagos_proveedor(cierre_id);

-- Row Level Security (solo usuarios autenticados)
ALTER TABLE cierres_caja    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_proveedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo_autenticados_cierres"
  ON cierres_caja FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "solo_autenticados_pagos"
  ON pagos_proveedor FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
