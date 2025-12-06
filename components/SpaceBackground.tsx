export default function SpaceBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#0f0f14]">
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 0, 153, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 0, 153, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Subtle pink accent in corner */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-3xl" />
    </div>
  )
}
