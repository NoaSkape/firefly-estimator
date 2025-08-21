type Props = {
  src?: string
  alt?: string
  overlay?: string
}

export default function BackgroundImage({ src = '/hero/tiny-home-dusk.jpg', alt = 'Tiny home at dusk', overlay = 'from-black/55 via-black/30 to-transparent' }: Props) {
  // Fixed, covers viewport, sits behind fireflies and content
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${src})`
        }}
        role="img"
        aria-label={alt}
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${overlay}`} />
    </div>
  )
}


