"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-2 border-slate-300 dark:border-slate-600 shadow-xl w-10 h-10 sm:w-12 sm:h-12"
      >
        <div className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-2 border-slate-300 dark:border-slate-600 shadow-xl hover:shadow-2xl transition-all hover:scale-110 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700 dark:text-slate-300" />
      )}
    </Button>
  )
}

