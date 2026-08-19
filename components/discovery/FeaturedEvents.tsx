import EventCard from './EventCard'

type FeaturedEvent = {
  id: string
  title: string
  description: string | null
  location: string
  event_date: string
  image_url: string | null
  interestNames: string[]
  price: string
}

export default function FeaturedEvents({
  events,
}: {
  events: FeaturedEvent[]
}) {
  if (events.length === 0) {
    return (
      <div
        style={{
          padding: '48px 20px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 15, color: '#999' }}>
          No events yet. Check back soon!
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '0 20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 20,
      }}
    >
      {events.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          title={event.title}
          description={event.description}
          location={event.location}
          eventDate={event.event_date}
          imageUrl={event.image_url}
          interestNames={event.interestNames}
          price={event.price}
        />
      ))}
    </div>
  )
}
