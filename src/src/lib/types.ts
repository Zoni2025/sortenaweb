export interface Profile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  subscription_status: 'active' | 'inactive' | 'trial'
  subscription_expires_at: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface Sorteio {
  id: string
  user_id: string
  title: string
  description: string | null
  slug: string
  status: 'draft' | 'active' | 'finished' | 'cancelled'
  draw_date: string | null
  max_participants: number | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface Premio {
  id: string
  sorteio_id: string
  name: string
  description: string | null
  image_url: string | null
  quantity: number
  win_percentage: number
  created_at: string
}

export interface Participante {
  id: string
  sorteio_id: string
  email: string
  name: string | null
  phone: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface Ganhador {
  id: string
  sorteio_id: string
  participante_id: string
  premio_id: string
  revealed: boolean
  revealed_at: string | null
  created_at: string
  participante?: Participante
  premio?: Premio
}
