# 📦 Cierre de Caja — Guía de instalación

## Estructura de la app

- **Inicio** — resumen del día con estado de cada TPV
- **Nuevo cierre** — formulario completo con efectivo, datáfonos y pagos a proveedores
- **Historial** — todos los cierres con filtros por TPV y fechas, agrupados por día

---

## 1. Configurar Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea un proyecto nuevo (gratis).
2. En el menú izquierdo, abre **SQL Editor** y ejecuta todo el contenido de `supabase-schema.sql`.
3. En **Project Settings → API** copia:
   - **Project URL** (algo como `https://abcdef.supabase.co`)
   - **anon public key**

---

## 2. Desplegar en Vercel

1. Sube esta carpeta a un repositorio GitHub (nuevo repo, público o privado).
2. Ve a [https://vercel.com](https://vercel.com) → **New Project** → importa tu repo.
3. En **Environment Variables** añade:
   ```
   NEXT_PUBLIC_SUPABASE_URL   = https://TU_PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = TU_ANON_KEY
   ```
4. Haz clic en **Deploy**. ¡Listo!

---

## 3. Desarrollo local (opcional)

```bash
cp .env.local.example .env.local
# Edita .env.local con tus valores de Supabase

npm install
npm run dev
# Abre http://localhost:3000
```

---

## Lógica del cierre

```
Total caja = (Efectivo contado − Pagos proveedores) + Datáfono 1 + Datáfono 2
```

- Los **datáfonos son compartidos** entre TPV1 y TPV2. Debes introducir el importe de cada datáfono en el cierre del TPV que los haya cuadrado.
- Los **pagos a proveedores** se restan del efectivo contado antes de calcular el total.
- No se puede cerrar el mismo TPV dos veces en el mismo turno y fecha.

---

## Tablas en Supabase

| Tabla | Descripción |
|-------|-------------|
| `cierres_caja` | Un registro por cierre. Incluye columnas calculadas automáticamente. |
| `pagos_proveedor` | Detalle de cada pago a proveedor, vinculado a su cierre. |
