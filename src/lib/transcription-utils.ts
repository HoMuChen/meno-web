/**
 * Generate consistent color for speaker dot based on speaker name
 * Uses a hash function to ensure the same speaker always gets the same color
 */
export function getSpeakerDotColor(speaker: string): string {
  // Hash function to generate consistent color from string
  let hash = 0
  for (let i = 0; i < speaker.length; i++) {
    hash = speaker.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Generate colors for speaker dots
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-amber-500',
    'bg-indigo-500',
  ]

  return colors[Math.abs(hash) % colors.length]
}
