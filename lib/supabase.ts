import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export type Turno = 'mañana' | 'tarde' | 'completo'
export type TPV = 'TPV1' | 'TPV2'

export interface PagoProveedor {
  id?: string
  cierre_id?: string | null
  tpv: TPV
  fecha: string
  concepto: string
  importe: number
  created_at?: string
}

export interface CierreCaja {
  id?: string
  tpv: TPV
  fecha: string
  turno: Turno
  efectivo_contado: number
  pagos_proveedor: number
  efectivo_neto?: number
  datafono1_importe: number
  datafono2_importe: number
  total_datafono?: number
  total_caja?: number
  notas?: string
  cerrado_por?: string
  created_at?: string
  pagos?: PagoProveedor[]
}
