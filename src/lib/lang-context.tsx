'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Lang = 'fr' | 'en'

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangContextType>({
  lang: 'fr',
  setLang: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('fsn-lang') as Lang | null
    if (saved === 'fr' || saved === 'en') {
      setLangState(saved)
      document.documentElement.setAttribute('lang', saved)
    } else {
      document.documentElement.setAttribute('lang', 'fr')
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('fsn-lang', l)
    document.documentElement.setAttribute('lang', l)
  }, [])

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
