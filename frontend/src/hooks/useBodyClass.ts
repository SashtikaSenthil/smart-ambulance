import { useEffect } from 'react'

/** Adds a class to <body> while the page is mounted (the records pages used <body class="patient-records">). */
export function useBodyClass(className: string) {
  useEffect(() => {
    document.body.classList.add(className)
    return () => document.body.classList.remove(className)
  }, [className])
}
