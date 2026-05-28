-- ============================================================
--  ESQUEMA SUPABASE — CIERRES DE CAJA
--  Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Tabla de cierres de caja
CREATE TABLE IF NOT EXISTS cierres_caja (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tpv            TEXT NOT NULL CHECK (tpv IN ('TPV1', 'TPV2')),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  turno          TEXT NOT NULL CHECK (turno IN ('mañana', 'tarde', 'completo')),

  -- Efectivo
  efectivo_contado    NUMERIC(10,2) NOT NULL DEFAULT 0,
  pagos_proveedor     NUMERIC(10,2) NOT NULL DEFAULT 0,
  efectivo_neto       NUMERIC(10,2) GENERATED ALWAYS AS (efectivo_contado - pagos_proveedor) STORED,

  -- Datáfonos (compartidos entre cajas → se registran en cada cierre)
  datafono1_importe   NUMERIC(10,2) NOT NULL DEFAULT 0,
  datafono2_importe   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_datafono      NUMERIC(10,2) GENERATED ALWAYS AS (datafono1_importe + datafono2_importe) STORED,

  -- Total general del cierre
  total_caja          NUMERIC(10,2) GENERATED ALWAYS AS (
                        (efectivo_contado - pagos_proveedor) + datafono1_importe + datafono2_importe
                      ) STORED,

  notas          TEXT,
  cerrado_por    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un TPV no puede cerrar dos veces el mismo día en el mismo turno
  UNIQUE (tpv, fecha, turno)
);

-- Tabla de pagos a proveedores (detalle de cada pago)
CREATE TABLE IF NOT EXISTS pagos_proveedor (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id      UUID REFERENCES cierres_caja(id) ON DELETE CASCADE,
  tpv            TEXT NOT NULL CHECK (tpv IN ('TPV1', 'TPV2')),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  concepto       TEXT NOT NULL,
  importe        NUMERIC(10,2) NOT NULL CHECK (importe > 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX idx_cierres_fecha ON cierres_caja(fecha DESC);
CREATE INDEX idx_cierres_tpv   ON cierres_caja(tpv);
CREATE INDEX idx_pagos_cierre  ON pagos_proveedor(cierre_id);
CREATE INDEX idx_pagos_fecha   ON pagos_proveedor(fecha DESC);

-- Habilita Row Level Security (recomendado para producción)
ALTER TABLE cierres_caja     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_proveedor  ENABLE ROW LEVEL SECURITY;

-- Política permisiva para anon (ajústala si usas autenticación)
CREATE POLICY "acceso_publico_cierres"
  ON cierres_caja FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "acceso_publico_pagos"
  ON pagos_proveedor FOR ALL USING (true) WITH CHECK (true);
