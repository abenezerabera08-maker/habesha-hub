export type DbEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  end_at: string | null
  location: string
  city_id: string | null
  image_url: string | null
  ticket_tiers: { price: number }[]
}

export type InterestRow = { id: string; name: string }
