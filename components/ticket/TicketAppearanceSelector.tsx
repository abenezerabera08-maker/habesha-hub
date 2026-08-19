'use client'

import type { VisualMode, ImageCropState } from './TicketTypeVisualMap'
import { TICKET_VISUAL_DEFAULTS, DEFAULT_IMAGE_CROP, TICKET_ARTWORK_ASPECT_RATIO } from './TicketTypeVisualMap'

type TicketAppearanceSelectorProps = {
  tierName: string
  visualMode: VisualMode
  customColor: string
  backgroundImageUrl: string
  imageCrop?: ImageCropState
  onModeChange: (mode: VisualMode) => void
  onCustomColorChange: (color: string) => void
  onBackgroundImageChange: (url: string) => void
  onImageCropChange?: (crop: ImageCropState) => void
}

const radioOptionStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${active ? '#171717' : '#ddd'}`,
  background: active ? '#f9f9f9' : '#fff',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
})

const radioDotStyle = (active: boolean): React.CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: `2px solid ${active ? '#171717' : '#ccc'}`,
  background: active ? '#171717' : 'transparent',
  flexShrink: 0,
  marginTop: 1,
  position: 'relative',
})

export default function TicketAppearanceSelector({
  tierName,
  visualMode,
  customColor,
  backgroundImageUrl,
  imageCrop,
  onModeChange,
  onCustomColorChange,
  onBackgroundImageChange,
  onImageCropChange,
}: TicketAppearanceSelectorProps) {
  const defaultVisual = TICKET_VISUAL_DEFAULTS[tierName]
  const defaultColor = defaultVisual?.primaryColor ?? '#6B7280'
  const crop = imageCrop ?? DEFAULT_IMAGE_CROP

  const recWidth = TICKET_ARTWORK_ASPECT_RATIO.width
  const recHeight = TICKET_ARTWORK_ASPECT_RATIO.height

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return
    const url = URL.createObjectURL(file)
    onBackgroundImageChange(url)
    if (onImageCropChange) {
      onImageCropChange(DEFAULT_IMAGE_CROP)
    }
  }

  const handleRemoveImage = () => {
    onBackgroundImageChange('')
    if (onImageCropChange) {
      onImageCropChange(DEFAULT_IMAGE_CROP)
    }
  }

  const updateCrop = (partial: Partial<ImageCropState>) => {
    if (onImageCropChange) {
      onImageCropChange({ ...crop, ...partial })
    }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
      <span style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 }}>
        Appearance
      </span>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        {tierName
          ? `Current default: ${defaultColor} for ${tierName}`
          : 'Select a ticket type first'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Automatic */}
        <label
          style={radioOptionStyle(visualMode === 'automatic')}
          onClick={() => onModeChange('automatic')}
        >
          <div style={radioDotStyle(visualMode === 'automatic')}>
            {visualMode === 'automatic' && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#fff',
                }}
              />
            )}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#171717' }}>Automatic</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Uses the recommended design for this ticket type
            </div>
            {tierName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: defaultColor,
                  }}
                />
                <span style={{ fontSize: 11, color: '#555' }}>
                  {defaultColor}
                </span>
              </div>
            )}
          </div>
        </label>

        {/* Custom Color */}
        <label
          style={radioOptionStyle(visualMode === 'custom_color')}
          onClick={() => onModeChange('custom_color')}
        >
          <div style={radioDotStyle(visualMode === 'custom_color')}>
            {visualMode === 'custom_color' && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#fff',
                }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#171717' }}>Custom Color</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Choose one base color — the system derives the full design
            </div>
            {visualMode === 'custom_color' && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={customColor || defaultColor}
                  onChange={(e) => {
                    e.stopPropagation()
                    onCustomColorChange(e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 40,
                    height: 40,
                    padding: 0,
                    border: '2px solid #ddd',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: 'none',
                  }}
                />
                <span style={{ fontSize: 13, color: '#555', fontFamily: 'monospace' }}>
                  {customColor || defaultColor}
                </span>
              </div>
            )}
          </div>
        </label>

        {/* Background Image */}
        <label
          style={radioOptionStyle(visualMode === 'image')}
          onClick={() => onModeChange('image')}
        >
          <div style={radioDotStyle(visualMode === 'image')}>
            {visualMode === 'image' && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#fff',
                }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#171717' }}>Background Image</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              Upload an image — the ticket type identity remains visible
            </div>
            {visualMode === 'image' && (
              <div style={{ marginTop: 10 }}>
                {backgroundImageUrl ? (
                  <div>
                    <img
                      src={backgroundImageUrl}
                      alt="Background preview"
                      style={{
                        width: '100%',
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #ddd',
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveImage()
                      }}
                      style={{
                        marginTop: 6,
                        background: 'none',
                        border: 'none',
                        color: '#c00',
                        cursor: 'pointer',
                        fontSize: 12,
                        padding: 0,
                      }}
                    >
                      Remove image
                    </button>

                    {/* Image crop controls */}
                    {onImageCropChange && (
                      <div style={{ marginTop: 12, padding: '12px 0', borderTop: '1px solid #eee' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>
                          Position & Zoom
                        </div>

                        {/* Zoom */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#666' }}>Zoom</span>
                            <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
                              {crop.zoom.toFixed(1)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={crop.zoom}
                            onChange={(e) => {
                              e.stopPropagation()
                              updateCrop({ zoom: parseFloat(e.target.value) })
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%' }}
                          />
                        </div>

                        {/* Position X */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#666' }}>Horizontal</span>
                            <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
                              {crop.positionX}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={crop.positionX}
                            onChange={(e) => {
                              e.stopPropagation()
                              updateCrop({ positionX: parseInt(e.target.value, 10) })
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%' }}
                          />
                        </div>

                        {/* Position Y */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: '#666' }}>Vertical</span>
                            <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
                              {crop.positionY}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={crop.positionY}
                            onChange={(e) => {
                              e.stopPropagation()
                              updateCrop({ positionY: parseInt(e.target.value, 10) })
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '100%' }}
                          />
                        </div>

                        {/* Reset */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            updateCrop(DEFAULT_IMAGE_CROP)
                          }}
                          style={{
                            fontSize: 11,
                            color: '#171717',
                            background: '#f3f4f6',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            padding: '4px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          Reset Position
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>
                      JPG, PNG, or WebP. Max 5 MB.
                    </p>
                    <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
                      Best results: upload a high-resolution image. Keep important faces, logos, and subjects near the center — the image will be cropped to fit the ticket frame ({recWidth}×{recHeight} ratio). You can drag and zoom after uploading.
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        e.stopPropagation()
                        handleImageUpload(e)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  )
}
