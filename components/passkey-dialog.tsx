"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

interface PasskeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (passkey: string) => void
  title?: string
  description?: string
}

export function PasskeyDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  title = "Enter Passkey",
  description = "Please enter your passkey to proceed with this action."
}: PasskeyDialogProps) {
  const [passkey, setPasskey] = useState("")
  const [error, setError] = useState("")

  // Load saved passkey when dialog opens
  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem('analyzer_passkey')
        if (saved) {
          setPasskey(saved)
        } else {
          setPasskey("")
        }
        setError("")
      } catch {
        setPasskey("")
      }
    }
  }, [open])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const key = passkey.trim()
    
    if (!key) {
      setError("Passkey is required")
      return
    }

    // Save to localStorage
    try {
      localStorage.setItem('analyzer_passkey', key)
    } catch (err) {
      console.error("Failed to save passkey:", err)
    }

    onConfirm(key)
    onOpenChange(false)
    setPasskey("")
    setError("")
  }

  const handleCancel = () => {
    onOpenChange(false)
    setPasskey("")
    setError("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
              <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="passkey">Passkey</Label>
              <Input
                id="passkey"
                type="password"
                value={passkey}
                onChange={(e) => {
                  setPasskey(e.target.value)
                  setError("")
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter your passkey"
                className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The passkey will be saved for future use.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              className="border-slate-300 dark:border-slate-600"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

