const MaterialBadge = ({ nome, quantidade }) => {
  // Cores baseadas no hash do nome
  const colors = [
    'bg-blue-900/40 text-blue-300 border-blue-700',
    'bg-purple-900/40 text-purple-300 border-purple-700',
    'bg-green-900/40 text-green-300 border-green-700',
    'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    'bg-red-900/40 text-red-300 border-red-700',
    'bg-cyan-900/40 text-cyan-300 border-cyan-700',
    'bg-orange-900/40 text-orange-300 border-orange-700',
    'bg-pink-900/40 text-pink-300 border-pink-700',
  ]

  const colorIndex = nome?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium ${colors[colorIndex]}`}>
      <span>🪨</span>
      <span>{nome}</span>
      <span className="font-bold ml-1">×{quantidade}</span>
    </span>
  )
}

export default MaterialBadge
