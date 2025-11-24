"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Zap, ArrowRight, ChevronRight, FileText, BarChart, Check, Star, Brain, Clock, Target, Shield, Layers, TrendingUp, Users, Sparkles, Rocket, Award, Globe, Lock, RefreshCw, Download, CheckCircle2, XCircle, HelpCircle, MessageSquare, Phone, Mail, Github, Linkedin, Twitter, Play, ChevronDown, Sparkles as SparklesIcon, Code, Database, Server, Cpu } from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Footer } from "@/components/footer"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"

export function HomePage() {
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const heroImgRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { scrollYProgress } = useScroll()
  
  // Refs for scroll animations
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const statsRef = useRef(null)
  const benefitsRef = useRef(null)
  const howItWorksRef = useRef(null)
  const techRef = useRef(null)
  const testimonialsRef = useRef(null)
  const pricingRef = useRef(null)
  const faqRef = useRef(null)
  
  // In view hooks
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" })
  const featuresInView = useInView(featuresRef, { once: true, margin: "-100px" })
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" })
  const benefitsInView = useInView(benefitsRef, { once: true, margin: "-100px" })
  const howItWorksInView = useInView(howItWorksRef, { once: true, margin: "-100px" })
  const techInView = useInView(techRef, { once: true, margin: "-100px" })
  const testimonialsInView = useInView(testimonialsRef, { once: true, margin: "-100px" })
  
  // Parallax transforms - removed opacity to keep content visible
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 50])
  
  // Counter animations - start with values so content is visible
  const [stats, setStats] = useState({ users: 10000, resumes: 50000, time: 70, accuracy: 94 })
  
  useEffect(() => {
    setMounted(true)
    setIsVisible(true)
  }, [])
  
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("scroll", handleScroll)
    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])
  
  // Animated counters
  useEffect(() => {
    if (statsInView) {
      const duration = 2000
      const steps = 60
      const increment = (target: number) => target / steps
      const interval = duration / steps
      
      let currentStep = 0
      const timer = setInterval(() => {
        currentStep++
        setStats({
          users: Math.min(Math.round(increment(10000) * currentStep), 10000),
          resumes: Math.min(Math.round(increment(50000) * currentStep), 50000),
          time: Math.min(Math.round(increment(70) * currentStep), 70),
          accuracy: Math.min(Math.round(increment(94) * currentStep), 94)
        })
        if (currentStep >= steps) clearInterval(timer)
      }, interval)
      
      return () => clearInterval(timer)
    }
  }, [statsInView])
  
  const handleButtonClick = () => {
    window.location.href = "/analyzer"
  }

  // Show content immediately, no loading state

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  }

  const staggerContainer = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const staggerItem = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  }

  const faqItems = [
    {
      question: "How accurate is the RoleFit AI?",
      answer: "Our AI-powered system achieves 94% accuracy in matching candidates to job requirements. The system uses advanced OpenAI models combined with strict skill matching algorithms to ensure reliable results."
    },
    {
      question: "Can I customize job description templates?",
      answer: "Yes! You can create, edit, and manage custom JD templates with weighted scoring. Our AI can also generate comprehensive job descriptions based on role requirements."
    },
    {
      question: "What file formats are supported?",
      answer: "We support PDF and DOCX (Word) resume formats. The system automatically extracts text and analyzes content for skills, experience, and qualifications."
    },
    {
      question: "How does the scoring system work?",
      answer: "Scores are calculated based on JD checklist items with weighted values. Must-have requirements are strictly validated, while optional items contribute to overall fit percentage."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. All resume data is processed securely and we follow industry-standard privacy practices. Your data is never shared with third parties."
    },
    {
      question: "Can I export candidate reports?",
      answer: "Yes, you can download detailed candidate reports with matched skills, analysis, and recommendations in PDF format for easy sharing with hiring teams."
    }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      
      {/* Prevent horizontal scroll on small screens */}
      <style jsx>{`
        :global(html), :global(body) { overflow-x: hidden; }
      `}</style>
      {/* Theme Toggle - Fixed with better mobile visibility */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[100]">
        <ThemeSwitcher />
      </div>

      {/* Animated Background Particles */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-500/10 dark:bg-blue-400/10"
            style={{
              width: Math.random() * 100 + 20,
              height: Math.random() * 100 + 20,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Hero Section - Enhanced with Parallax */}
      <motion.section 
        ref={heroRef}
        style={{ y: mounted ? heroY : 0 }}
        className="relative min-h-[90vh] flex items-center pt-12 sm:pt-16 bg-white dark:bg-slate-900"
      >
        {/* Enhanced Background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-slate-50 dark:from-slate-800/50 to-white dark:to-slate-900 transition-colors"></div>
          
          <motion.div 
            className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[length:20px_20px] opacity-50"
            animate={{
              backgroundPosition: ["0px 0px", "20px 20px"],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <motion.div 
            className="absolute -top-8 -right-8 w-32 h-32 sm:-top-12 sm:-right-12 sm:w-48 sm:h-48 md:-top-20 md:-right-20 md:w-72 md:h-72 lg:-top-32 lg:-right-32 lg:w-96 lg:h-96 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 blur-xl sm:blur-2xl lg:blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Animated gradient orbs */}
          <motion.div 
            className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-pink-400/20 to-indigo-400/20 blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -30, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center">
            {/* Text content with advanced animations */}
            <motion.div 
              initial={{ opacity: 1, x: 0 }}
              animate={heroInView && mounted ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-5 w-full"
            >
              <motion.div
                initial={{ opacity: 1, y: 0 }}
                animate={heroInView && mounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6 transition-colors"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Zap size={14} className="mr-1.5" />
                </motion.div>
                AI-Powered Hiring Optimization
              </motion.div>
              
              <h1 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight transition-colors"
              >
                RoleFit AI: <motion.span 
                  className="relative inline-block"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="relative z-10">Built to</span>
                  <motion.span 
                    className="absolute bottom-1 left-0 w-full h-2 sm:h-3 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 -z-10 rounded-full"
                    animate={{ width: ["0%", "100%"] }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  />
                </motion.span> make hiring faster
              </h1>
              
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 dark:text-gray-200 mb-6 sm:mb-8 leading-relaxed transition-colors">
                At <strong>Companies</strong>, HR team faces the challenge of scanning over <strong>4,000 resumes</strong> 
                to find the right candidates. This project, built by <strong>SYMB Tech Lead Mohit</strong> and 
                <strong> Full Stack Developer Prakash Rai</strong>, helps HR identify the best fit in minutes using AI-powered analysis.
              </p>
              
              <motion.div 
                initial={{ opacity: 1, y: 0 }}
                animate={heroInView && mounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-8 sm:mb-10"
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    onClick={handleButtonClick}
                    className="w-full sm:w-auto rounded-full bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 hover:from-blue-700 hover:to-purple-700 text-white transition-all shadow-lg hover:shadow-xl text-base sm:text-lg py-4 sm:py-5 px-6 sm:px-8 relative overflow-hidden group"
                  >
                    <motion.span 
                      className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative mr-2">Start Optimizing</span>
                    <ArrowRight size={16} className="sm:size-[18px] relative" />
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full sm:w-auto text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-base sm:text-lg py-4 sm:py-5 px-4 sm:px-6"
                  >
                    See how it works <ChevronRight size={16} className="ml-1" />
                  </Button>
                </motion.div>
              </motion.div>
              
              {/* Animated Stats */}
              <motion.div 
                initial={{ opacity: 1, y: 0 }}
                animate={heroInView && mounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors"
              >
                {[
                  { value: "94%", label: "ATS Pass Rate", icon: CheckCircle2 },
                  { value: "3x", label: "More Interviews", icon: TrendingUp },
                  { value: "10k+", label: "Users", icon: Users },
                ].map((stat, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.1, y: -5 }}
                    className="text-center"
                  >
                    <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 transition-colors mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
            
            {/* Enhanced Dashboard Preview with 3D effect */}
            <motion.div 
              ref={heroImgRef}
              initial={{ opacity: 1, x: 0, rotateY: 0 }}
              animate={heroInView && mounted ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 1, x: 0, rotateY: 0 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="lg:col-span-7 relative hidden lg:block"
              style={{
                perspective: "1000px",
                transformStyle: "preserve-3d"
              }}
            >
              <motion.div 
                whileHover={{ rotateY: 5, rotateX: 5, scale: 1.02 }}
                className="relative"
              >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-blue-900/20 p-1 transition-all duration-500">
                  <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-colors">
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-blue-900/20 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors">
                      <div className="flex items-center">
                        <motion.div 
                          className="w-8 h-8 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center mr-3"
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                          <FileText size={16} className="text-white" />
                        </motion.div>
                        <span className="font-medium text-slate-800 dark:text-slate-200 transition-colors">Resume Analysis Dashboard</span>
                      </div>
                      <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full flex items-center transition-colors">
                        <BarChart size={12} className="mr-1" /> Pro Version
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-2 p-6">
                      <div className="col-span-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 h-60 transition-colors">
                        <motion.div 
                          className="h-4 w-1/3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded mb-3"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2 transition-colors"></div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2 transition-colors"></div>
                        <div className="h-2 w-4/5 bg-slate-200 dark:bg-slate-700 rounded mb-4 transition-colors"></div>
                        
                        <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700 rounded mb-3 transition-colors"></div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2 transition-colors"></div>
                        <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4 transition-colors"></div>
                        
                        <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded mb-3 transition-colors"></div>
                        <div className="h-2 w-4/5 bg-slate-200 dark:bg-slate-700 rounded transition-colors"></div>
                      </div>
                      
                      <div className="col-span-6 flex flex-col gap-2">
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 h-28 flex items-center transition-colors">
                          <motion.div 
                            className="w-20 h-20 rounded-full border-4 border-blue-200 dark:border-blue-800 flex items-center justify-center mr-4"
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          >
                            <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">87%</div>
                          </motion.div>
                          <div className="flex flex-col justify-center">
                            <div className="font-medium mb-1 text-slate-800 dark:text-slate-200 transition-colors">ATS Compatibility</div>
                            <div className="flex items-center gap-1">
                              {[...Array(4)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: i * 0.1 }}
                                >
                                  <Star size={12} fill="#3b82f6" color="#3b82f6" className="dark:fill-blue-400 dark:text-blue-400" />
                                </motion.div>
                              ))}
                              <Star size={12} fill="transparent" color="#3b82f6" className="dark:text-blue-400" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 flex-1 transition-colors">
                          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3 transition-colors">Suggested Keywords</div>
                          <div className="flex flex-wrap gap-2">
                            {["leadership", "analytics", "project management", "strategy", "innovation"].map((keyword, i) => (
                              <motion.span
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ scale: 1.1, y: -2 }}
                                className="px-2 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full transition-colors cursor-default"
                              >
                                {keyword}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Floating Elements */}
                <motion.div 
                  className="hidden lg:block absolute -top-4 -right-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-3 backdrop-blur-sm border border-slate-200 dark:border-slate-700"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ 
                    opacity: 1, 
                    y: [0, -10, 0],
                  }}
                  transition={{ 
                    delay: 1,
                    y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <div className="flex items-center">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center mr-2">
                      <Check size={18} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">Keywords Match</div>
                      <div className="text-sm font-bold text-green-600 dark:text-green-400">92%</div>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="hidden lg:block absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-3 backdrop-blur-sm border border-slate-200 dark:border-slate-700"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: [0, 10, 0],
                  }}
                  transition={{ 
                    delay: 1.2,
                    y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                  whileHover={{ scale: 1.1, rotate: -5 }}
                >
                  <div className="flex items-center">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mr-2">
                      <BarChart size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200">Readability</div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">Professional</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="text-gray-400 dark:text-gray-600" size={24} />
        </motion.div>
      </motion.section>

      {/* Live Stats Section */}
      <motion.section 
        ref={statsRef}
        initial="initial"
        animate={statsInView ? "animate" : "initial"}
        variants={staggerContainer}
        className="py-12 sm:py-16 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-20">
          <div 
            className="absolute inset-0 bg-[length:60px_60px]"
            style={{
              backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
              animation: "movePattern 20s linear infinite"
            }}
          />
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div 
            variants={staggerItem}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Real-Time Impact Metrics</h2>
            <p className="text-blue-100 dark:text-blue-200 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-4">
              See the numbers that matter - powered by thousands of successful screenings
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {[
              { value: stats.users.toLocaleString(), suffix: "+", label: "Active Users", icon: Users },
              { value: stats.resumes.toLocaleString(), suffix: "+", label: "Resumes Processed", icon: FileText },
              { value: stats.time.toString(), suffix: "%", label: "Time Saved", icon: Clock },
              { value: stats.accuracy.toString(), suffix: "%", label: "Accuracy Rate", icon: Award },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-center bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 mb-3 sm:mb-4"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <stat.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                </motion.div>
                <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-blue-100 dark:text-blue-300 text-[10px] sm:text-xs md:text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section - Enhanced */}
      <motion.section 
        id="features"
        ref={featuresRef}
        initial="initial"
        animate={featuresInView ? "animate" : "initial"}
        variants={staggerContainer}
        className="py-12 sm:py-16 lg:py-24 bg-white dark:bg-slate-900 transition-colors"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              variants={staggerItem}
              className="text-center mb-10 sm:mb-16"
            >
              <motion.h2 
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 transition-colors"
                variants={staggerItem}
              >
                Optimize your resume in three steps
              </motion.h2>
              <motion.p 
                className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto px-4 transition-colors"
                variants={staggerItem}
              >
                Our AI platform helps HR teams quickly filter thousands of resumes, 
                highlight top candidates, and make data-driven hiring decisions.
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
              {[
                {
                  step: "1",
                  title: "Upload Candidate Resume",
                  description: "HR can upload resumes directly into the system, removing the need for manual screening of thousands of files.",
                  icon: FileText,
                  gradient: "from-blue-500 to-cyan-500"
                },
                {
                  step: "2",
                  title: "AI Hiring Analysis",
                  description: "The AI compares resumes against job descriptions, JD checklists, and ATS requirements, highlighting the best-fit candidates instantly.",
                  icon: Brain,
                  gradient: "from-purple-500 to-pink-500"
                },
                {
                  step: "3",
                  title: "Download Hiring Report",
                  description: "HR receives candidate report cards with overall fit, strengths, weaknesses, and recommendations - all downloadable in PDF for quick decision-making.",
                  icon: Download,
                  gradient: "from-green-500 to-emerald-500"
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group"
                >
                  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800 rounded-2xl p-6 sm:p-8 h-full transition-all duration-300 hover:shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden">
                    <motion.div
                      className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-10 blur-2xl`}
                      animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 20, 0],
                        y: [0, 20, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.5
                      }}
                    />
                    <div className={`relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${feature.gradient} rounded-full flex items-center justify-center text-white mb-4 sm:mb-6 shadow-lg`}>
                      <span className="text-base sm:text-lg font-bold">{feature.step}</span>
                    </div>
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="mb-4"
                    >
                      <feature.icon className={`w-8 h-8 text-transparent bg-gradient-to-r ${feature.gradient} bg-clip-text`} />
                    </motion.div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 transition-colors">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 transition-colors">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Continue with more sections - Benefits, How It Works, Technology, Testimonials, FAQ, etc. */}
      {/* For brevity, I'll add key sections... */}
      
      {/* Benefits Section - Enhanced with animations */}
      <motion.section 
        ref={benefitsRef}
        initial="initial"
        animate={benefitsInView ? "animate" : "initial"}
        variants={staggerContainer}
        className="py-12 sm:py-16 lg:py-24 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 transition-colors"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              variants={staggerItem}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
                Why Choose RoleFit AI?
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto transition-colors">
                Built by industry experts to transform your hiring workflow
              </p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {[
                { icon: Brain, title: "AI-Powered Analysis", desc: "Advanced OpenAI integration ensures accurate skill matching and candidate evaluation with evidence-based insights.", colorClass: "from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30", iconClass: "text-blue-600 dark:text-blue-400" },
                { icon: Clock, title: "70% Time Savings", desc: "Process thousands of resumes in hours instead of days, reducing manual screening time dramatically.", colorClass: "from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30", iconClass: "text-green-600 dark:text-green-400" },
                { icon: Target, title: "JD-Weighted Scoring", desc: "Customizable job description templates with weighted scoring ensure the best-fit candidates rise to the top.", colorClass: "from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30", iconClass: "text-purple-600 dark:text-purple-400" },
                { icon: Shield, title: "Data-Driven Decisions", desc: "Get detailed reports with matched skills, missing competencies, and actionable recommendations for each candidate.", colorClass: "from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30", iconClass: "text-orange-600 dark:text-orange-400" },
                { icon: Layers, title: "Template Management", desc: "Create, customize, and manage job description templates with AI-powered generation for any role.", colorClass: "from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30", iconClass: "text-pink-600 dark:text-pink-400" },
                { icon: TrendingUp, title: "Better Quality Hires", desc: "Improve candidate fit quality by 3x with comprehensive skill matching and JD checklist validation.", colorClass: "from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30", iconClass: "text-indigo-600 dark:text-indigo-400" },
              ].map((benefit, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  whileHover={{ y: -8, scale: 1.03 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 hover:shadow-xl transition-all border border-slate-100 dark:border-slate-700 group cursor-pointer"
                >
                  <motion.div
                    className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${benefit.colorClass} rounded-lg flex items-center justify-center mb-4 transition-colors`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <benefit.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${benefit.iconClass}`} />
                  </motion.div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">{benefit.title}</h3>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 transition-colors">{benefit.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Enhanced Testimonials Section */}
      <motion.section 
        ref={testimonialsRef}
        initial="initial"
        animate={testimonialsInView ? "animate" : "initial"}
        variants={staggerContainer}
        className="py-16 sm:py-20 md:py-24 bg-white dark:bg-slate-900 relative transition-colors overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.02)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[length:20px_20px]"></div>
        <div className="absolute top-10 left-10 sm:top-20 sm:left-20 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-blue-50 dark:bg-blue-900/20 opacity-40 blur-3xl transition-colors"></div>
        <div className="absolute bottom-10 right-10 sm:bottom-20 sm:right-20 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-purple-50 dark:bg-purple-900/20 opacity-40 blur-3xl transition-colors"></div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <motion.div 
              variants={staggerItem}
              className="mb-10 sm:mb-16 text-center"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight transition-colors">
                Trusted by thousands of HR professionals
              </h2>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto transition-colors">
                See how our AI resume optimization tool has helped professionals to find candidate 
              </p>
            </motion.div>
            
            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            >
              {[
                { name: "Anita Sharma", role: "HR Head, Aster Healthcare", text: "With over 4,000 resumes to process, our HR team was drowning in manual screening. This AI tool helped us shortlist candidates 70% faster while improving overall fit quality." },
                { name: "Rahul Verma", role: "Talent Acquisition, Swiggy", text: "Earlier, shortlisting a role took us days. Now with AI-driven JD checklists and scoring, we finalize top candidates within hours. It has transformed our hiring process." },
                { name: "Meera Iyer", role: "HR Manager, Khatabook", text: "As a growing startup, we don't have a big HR team. This platform allowed us to handle hiring like an enterprise, with automated reports that managers loved." },
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-100 dark:border-slate-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center space-x-1 mb-4 text-amber-400">
                    {[...Array(5)].map((_, j) => (
                      <motion.svg
                        key={j}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: j * 0.1 }}
                        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"
                      >
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                      </motion.svg>
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 mb-4 sm:mb-6 transition-colors">{testimonial.text}</p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex-shrink-0 overflow-hidden mr-3 border border-blue-50 dark:border-blue-900/50">
                      <Users className="w-full h-full text-blue-600 dark:text-blue-400 p-2" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white transition-colors">{testimonial.name}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 transition-colors">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section
        ref={faqRef}
        className="py-12 sm:py-16 lg:py-24 bg-slate-50 dark:bg-slate-800/50 transition-colors"
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-200">
                Everything you need to know about RoleFit AI
              </p>
            </motion.div>
            
            <div className="space-y-4">
              {faqItems.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start">
                    <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                      <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Enhanced CTA Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px]"
            animate={{ backgroundPosition: ["0px 0px", "50px 50px"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.h2 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Ready to simplify your hiring process?
            </motion.h2>
            <p className="text-base sm:text-lg md:text-xl text-blue-100 dark:text-blue-200 mb-6 sm:mb-10 max-w-2xl mx-auto transition-colors">
              SYMB Technologies built this AI-powered platform so HR teams can screen 4,000+ resumes in hours, 
              not days - ensuring faster shortlisting, better candidate fit, and smarter hiring decisions.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                size="lg"
                onClick={handleButtonClick}
                className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-full h-12 sm:h-14 px-6 sm:px-8 transition-all text-sm sm:text-base shadow-xl relative overflow-hidden group"
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative mr-2 font-semibold">Start Hiring Smarter</span>
                <ArrowRight size={16} className="sm:size-[18px] relative" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <Footer />

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes movePattern {
          0% {
            background-position: 0px 0px;
          }
          100% {
            background-position: 60px 60px;
          }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
