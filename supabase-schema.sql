-- ============================================================
--  ESQUEMA SUPABASE — CIERRES DE CAJA v3
--  Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

DROP TABLE IF EXISTS pagos_proveedor CASCADE;
DROP TABLE IF EXISTS cierres_caja CASCADE;

CREATE TABLE cierres_caja (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                 DATE NOT NULL DEFAULT CURRENT_DATE,
  turno                 TEXT NOT NULL CHECK (turno IN ('mañana', 'tarde', 'completo')),

  -- Fondo apertura
  fondo_apertura        NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Ventas por TPV
  tpv1_efectivo         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tpv1_tarjeta          NUMERIC(10,2) NOT NULL DEFAULT 0,
  tpv2_efectivo         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tpv2_tarjeta          NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Cierres de datáfonos
  datafono1_cierre      NUMERIC(10,2) NOT NULL DEFAULT 0,
  datafono2_cierre      NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Efectivo contado físicamente al cerrar
  efectivo_contado      NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Pagos a proveedores en efectivo
  pagos_proveedor       NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Retirada
  retirada_efectivo     NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Columnas calculadas
  total_efectivo_ventas NUMERIC(10,2) GENERATED ALWAYS AS (tpv1_efectivo + tpv2_efectivo) STORED,
  total_tarjeta_ventas  NUMERIC(10,2) GENERATED ALWAYS AS (tpv1_tarjeta + tpv2_tarjeta) STORED,
  total_datafono        NUMERIC(10,2) GENERATED ALWAYS AS (datafono1_cierre + datafono2_cierre) STORED,
  total_ventas          NUMERIC(10,2) GENERATED ALWAYS AS (tpv1_efectivo + tpv2_efectivo + tpv1_tarjeta + tpv2_tarjeta) STORED,

  -- Efectivo esperado en caja = fondo + ventas efectivo - pagos proveedores
  efectivo_esperado     NUMERIC(10,2) GENERATED ALWAYS AS (fondo_apertura + tpv1_efectivo + tpv2_efectivo - pagos_proveedor) STORED,

  -- Diferencia (contado - esperado): positivo = sobra, negativo = falta
  diferencia_efectivo   NUMERIC(10,2) GENERATED ALWAYS AS (efectivo_contado - (fondo_apertura + tpv1_efectivo + tpv2_efectivo - pagos_proveedor)) STORED,

  -- Diferencia datáfonos (cierre datafono vs ventas tarjeta registradas)
  diferencia_datafono   NUMERIC(10,2) GENERATED ALWAYS AS ((datafono1_cierre + datafono2_cierre) - (tpv1_tarjeta + tpv2_tarjeta)) STORED,

  -- Fondo para el día siguiente
  fondo_siguiente_dia   NUMERIC(10,2) GENERATED ALWAYS AS (efectivo_contado - retirada_efectivo) STORED,

  notas                 TEXT,
  cerrado_por           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (fecha, turno)
);

CREATE TABLE pagos_proveedor (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id  UUID REFERENCES cierres_caja(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto   TEXT NOT NULL,
  importe    NUMERIC(10,2) NOT NULL CHECK (importe > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cierres_fecha ON cierres_caja(fecha DESC);
CREATE INDEX idx_pagos_cierre  ON pagos_proveedor(cierre_id);

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

-- ============================================================
--  TABLA INGRESOS EN BANCO (añadir al schema existente)
-- ============================================================
CREATE TABLE IF NOT EXISTS ingresos_banco (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  importe     NUMERIC(10,2) NOT NULL CHECK (importe > 0),
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ingresos_fecha ON ingresos_banco(fecha DESC);

ALTER TABLE ingresos_banco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo_autenticados_ingresos"
  ON ingresos_banco FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
