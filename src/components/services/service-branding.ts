export function getServiceBranding(name: string) {
  const key = name.toLowerCase()

  if (key.includes('youtube')) {
    return {
      icon: 'YT',
      bg: 'bg-red-50',
      ring: 'ring-red-100',
      text: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
    }
  }

  if (key.includes('netflix')) {
    return {
      icon: 'N',
      bg: 'bg-neutral-900 text-white',
      ring: 'ring-neutral-300',
      text: 'text-neutral-50',
      badge: 'bg-neutral-800 text-red-200',
    }
  }

  if (key.includes('icloud') || key.includes('apple')) {
    return {
      icon: 'CL',
      bg: 'bg-blue-50',
      ring: 'ring-blue-100',
      text: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    }
  }

  if (key.includes('spotify')) {
    return {
      icon: 'SP',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-100',
      text: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
    }
  }

  if (key.includes('disney')) {
    return {
      icon: 'DS',
      bg: 'bg-indigo-50',
      ring: 'ring-indigo-100',
      text: 'text-indigo-600',
      badge: 'bg-indigo-100 text-indigo-700',
    }
  }

  if (key.includes('google') || key.includes('workspace')) {
    return {
      icon: 'G',
      bg: 'bg-amber-50',
      ring: 'ring-amber-100',
      text: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
    }
  }

  return {
    icon: name.charAt(0).toUpperCase() || 'S',
    bg: 'bg-slate-50',
    ring: 'ring-slate-200',
    text: 'text-slate-700',
    badge: 'bg-slate-200 text-slate-700',
  }
}
