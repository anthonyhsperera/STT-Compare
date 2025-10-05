interface DeepgramLogoProps {
  className?: string
}

export const DeepgramLogo: React.FC<DeepgramLogoProps> = ({ className = "h-8" }) => {
  return (
    <span className={`${className} text-white font-bold text-xl tracking-tight`}>
      Deepgram
    </span>
  )
}
