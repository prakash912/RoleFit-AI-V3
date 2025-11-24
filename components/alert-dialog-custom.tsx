"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react"

export type AlertType = "error" | "success" | "info" | "warning"

interface AlertDialogCustomProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  type?: AlertType
  confirmText?: string
  showCancel?: boolean
  cancelText?: string
  onConfirm?: () => void
}

export function AlertDialogCustom({
  open,
  onOpenChange,
  title,
  message,
  type = "info",
  confirmText = "OK",
  showCancel = false,
  cancelText = "Cancel",
  onConfirm,
}: AlertDialogCustomProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onOpenChange(false)
  }

  const icons = {
    error: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />,
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
  }

  const colors = {
    error: "border-red-200 dark:border-red-800",
    success: "border-green-200 dark:border-green-800",
    info: "border-blue-200 dark:border-blue-800",
    warning: "border-yellow-200 dark:border-yellow-800",
  }

  const buttonColors = {
    error: "bg-red-500 hover:bg-red-600 text-white",
    success: "bg-green-500 hover:bg-green-600 text-white",
    info: "bg-blue-500 hover:bg-blue-600 text-white",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white",
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={`${colors[type]}`}>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
              {icons[type]}
            </div>
            <AlertDialogTitle className="text-xl font-bold">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {showCancel && (
            <AlertDialogCancel className="border-slate-300 dark:border-slate-600">
              {cancelText}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={handleConfirm}
            className={buttonColors[type]}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for easy use
export function useAlertDialog() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<{
    title: string
    message: string
    type?: AlertType
    confirmText?: string
    showCancel?: boolean
    cancelText?: string
    onConfirm?: () => void
  }>({
    title: "",
    message: "",
    type: "info",
  })

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = "info",
    confirmText?: string,
    showCancel?: boolean,
    cancelText?: string,
    onConfirm?: () => void
  ) => {
    setConfig({
      title,
      message,
      type,
      confirmText,
      showCancel,
      cancelText,
      onConfirm,
    })
    setOpen(true)
  }

  const AlertComponent = () => (
    <AlertDialogCustom
      open={open}
      onOpenChange={setOpen}
      title={config.title}
      message={config.message}
      type={config.type}
      confirmText={config.confirmText}
      showCancel={config.showCancel}
      cancelText={config.cancelText}
      onConfirm={config.onConfirm}
    />
  )

  return { showAlert, AlertComponent }
}

