import { createClient } from '@/lib/supabase/server'
import type { DbEvent, InterestRow } from '@/lib/types/discover'
import { isEventDiscoverable } from '@/lib/eventStatus'
import DiscoverContent from '@/components/discovery/DiscoverContent'

export default async function DiscoverPage() {
  const supabase = await createClient()

  // Check for logged-in user (non-blocking — Discover works for everyone)
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch viewer profile + interests in parallel if logged in
  let viewerCityId: string | null = null
  let viewerInterestIds: string[] = []
  let userName: string | null = null

  if (user) {
    const [profileRes, userInterestsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, location')
        .eq('id', user.id)
        .single(),
      supabase
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id),
    ])
    viewerCityId = profileRes.data?.location ?? null
    userName = profileRes.data?.full_name || null
    viewerInterestIds = (userInterestsRes.data ?? []).map((i) => i.interest_id)
  }

  // Always fetch interests + events in parallel
  const [interestsRes, eventsRes] = await Promise.all([
    supabase
      .from('interests')
      .select('id, name')
      .order('name'),
    supabase
      .from('events')
      .select('id, title, description, event_date, end_at, location, city_id, image_url, ticket_tiers ( price )')
      .eq('status', 'published')
      .order('event_date', { ascending: true }),
  ])

  // Fallback: if end_at column doesn't exist yet, re-fetch without it
  let eventsFromDb: DbEvent[]
  if (eventsRes.error) {
    const fallback = await supabase
      .from('events')
      .select('id, title, description, event_date, location, city_id, image_url, ticket_tiers ( price )')
      .eq('status', 'published')
      .order('event_date', { ascending: true })
    eventsFromDb = ((fallback.data ?? []) as Record<string, unknown>[]).map((e) => ({
      ...e,
      end_at: null,
    })) as DbEvent[]
  } else {
    eventsFromDb = (eventsRes.data ?? []) as DbEvent[]
  }

  const allInterests = (interestsRes.data ?? []) as InterestRow[]
  const rawEvents = eventsFromDb.filter((e) =>
    isEventDiscoverable(e.event_date, e.end_at)
  )

  // Build interestNameMap as plain object
  const interestNameMap: Record<string, string> = {}
  for (const row of allInterests) {
    interestNameMap[row.id] = row.name
  }

  // Fetch event_interests if we have events
  const eventInterestMap: Record<string, string[]> = {}
  if (rawEvents.length > 0) {
    const eventIds = rawEvents.map((e) => e.id)
    const { data: eventInterests } = await supabase
      .from('event_interests')
      .select('event_id, interest_id')
      .in('event_id', eventIds)
    for (const row of eventInterests ?? []) {
      if (!eventInterestMap[row.event_id]) {
        eventInterestMap[row.event_id] = []
      }
      eventInterestMap[row.event_id].push(row.interest_id)
    }
  }

  // Score events by city + interest match (same logic as before)
  const scored = rawEvents.map((event) => {
    let score = 0
    if (viewerCityId && event.city_id === viewerCityId) score += 1
    const eventInterests = eventInterestMap[event.id] ?? []
    if (eventInterests.some((id) => viewerInterestIds.includes(id))) score += 1
    return { event, score }
  })
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return new Date(a.event.event_date).getTime() - new Date(b.event.event_date).getTime()
  })

  const events = scored.map((s) => s.event)

  return (
    <DiscoverContent
      events={events}
      eventInterestMap={eventInterestMap}
      allInterests={allInterests}
      interestNameMap={interestNameMap}
      userName={userName}
    />
  )
}
