export default function SpaceBackground() {
  return (
    <div 
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2000")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay to make text readable */}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  )
}
