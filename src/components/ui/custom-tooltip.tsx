"use client"

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface CustomTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function CustomTooltip({ content, children, className }: CustomTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      // Position above the element, centered
      setPosition({
        top: rect.top - 8, // 8px gap above
        left: rect.left + rect.width / 2,
      })
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
      {isVisible && (
        <TooltipPortal>
          <div
            className="pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-xl animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.top, left: position.left }}
          >
            {content}
            {/* Arrow */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-indigo-600" />
          </div>
        </TooltipPortal>
      )}
    </div>
  )
}

function TooltipPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(children, document.body)
}
