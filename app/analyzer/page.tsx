"use client"
import { ResumeScreeningDashboard } from "@/components/resume-screening-dashboard"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { PasskeyDialog } from "@/components/passkey-dialog"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export default function AnalyzerPage() {
  const [showPasskeyModal, setShowPasskeyModal] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // Always ask for passkey on page load/refresh; clear any previous value
        localStorage.removeItem('analyzer_passkey')
      }
      setShowPasskeyModal(true)
    } catch {}
  }, [])

  const handleSavePasskey = (passkey: string) => {
    // Passkey is already saved in the dialog component
    // Just close the modal
    setShowPasskeyModal(false)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-indigo-50 dark:from-slate-900 via-purple-50 dark:via-slate-900 to-pink-50 dark:to-slate-950 transition-colors">
      <div className="hidden sm:block absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-pink-200 dark:from-pink-900/10 via-purple-200 dark:via-purple-900/10 to-indigo-200 dark:to-indigo-900/10 rounded-bl-[100px] opacity-50 dark:opacity-20 blur-2xl lg:blur-3xl -z-10 transition-colors"></div>
      <div className="hidden sm:block absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-indigo-200 dark:from-indigo-900/10 via-purple-200 dark:via-purple-900/10 to-pink-200 dark:to-pink-900/10 rounded-tr-[100px] opacity-50 dark:opacity-20 blur-2xl lg:blur-3xl -z-10 transition-colors"></div>

      {/* Header with Navigation and Theme Switcher */}
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center">
        <Link href="/">
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <ThemeSwitcher />
      </div>

      <main className="container mx-auto py-8 px-4 relative z-10 pt-20">
        <div className="text-center mb-12">
          <div className="inline-block p-2 bg-white dark:bg-slate-800 bg-opacity-80 rounded-xl shadow-sm mb-4 border border-slate-200 dark:border-slate-700 transition-colors">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
              <h1 className="text-5xl font-bold">RoleFit AI</h1>
            </div>
          </div>
          <p className="text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto transition-colors">
            Find your perfect candidates with our AI-powered resume screening and ranking system
          </p>
        </div>

        <ResumeScreeningDashboard />
      </main>

      <PasskeyDialog
        open={showPasskeyModal}
        onOpenChange={setShowPasskeyModal}
        onConfirm={handleSavePasskey}
        title="Enter Passkey"
        description="Please enter your passkey to manage roles and templates."
      />
    </div>
  )
}

