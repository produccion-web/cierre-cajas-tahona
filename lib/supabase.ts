import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password })
}
export async function signOut() {
  await supabase.auth.signOut()
}
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export type Turno = 'mañana' | 'tarde' | 'completo'

export interface PagoProveedor {
  id?: string
  cierre_id?: string | null
  fecha: string
  concepto: string
  importe: number
  created_at?: string
}

export interface CierreCaja {
  id?: string
  fecha: string
  turno: Turno
  fondo_apertura: number
  tpv1_efectivo: number
  tpv1_tarjeta: number
  tpv2_efectivo: number
  tpv2_tarjeta: number
  pagos_proveedor: number
  retirada_efectivo: number
  // computed
  total_efectivo_ventas?: number
  total_tarjeta?: number
  efectivo_en_caja?: number
  fondo_siguiente_dia?: number
  total_ventas?: number
  notas?: string
  cerrado_por?: string
  created_at?: string
  pagos?: PagoProveedor[]
}
