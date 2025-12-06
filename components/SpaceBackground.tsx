export default function SpaceBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0a0a12]">
      {/* Stars - simple dots */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            radial-gradient(circle at 40% 70%, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            radial-gradient(circle at 90% 60%, rgba(255, 0, 153, 0.1) 2px, transparent 2px),
            radial-gradient(circle at 10% 80%, rgba(255, 0, 153, 0.08) 1px, transparent 1px),
            radial-gradient(circle at 60% 40%, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Very subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-pink-950/5" />
    </div>
  )
}
