import { resolveVisual, type VisualMode, type ImageCropState, DEFAULT_IMAGE_CROP } from './TicketTypeVisualMap'
import VerticalTicket from './VerticalTicket'

type TicketPreviewProps = {
  tierName: string
  visualMode: VisualMode
  customColor: string
  backgroundImageUrl: string
  imageCrop?: ImageCropState
  eventName?: string
  eventDate?: string
  eventLocation?: string
  quantity?: number
  admissionCount?: number
  price?: string
}

export default function TicketPreview({
  tierName,
  visualMode,
  customColor,
  backgroundImageUrl,
  imageCrop,
  eventName,
  eventDate,
  eventLocation,
  quantity,
  admissionCount,
  price,
}: TicketPreviewProps) {
  const crop = imageCrop ?? DEFAULT_IMAGE_CROP
  const visual = resolveVisual(
    tierName,
    visualMode,
    customColor || null,
    backgroundImageUrl || null,
    visualMode === 'image' && backgroundImageUrl ? backgroundImageUrl : null,
  )

  return (
    <div style={{ marginTop: 16 }}>
      <span
        style={{
          display: 'block',
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 600,
          color: '#555',
        }}
      >
        Ticket Preview
      </span>
      <div
        style={{
          background: '#0b0d12',
          borderRadius: 12,
          padding: 24,
          maxWidth: 440,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <VerticalTicket
          visual={{
            ...visual,
            artworkImage:
              visualMode === 'image' && backgroundImageUrl
                ? backgroundImageUrl
                : null,
          }}
          eventName={eventName}
          eventDate={eventDate}
          eventLocation={eventLocation}
          imageCrop={crop}
          quantity={quantity}
          admissionCount={admissionCount}
          price={price}
        />
      </div>
    </div>
  )
}
