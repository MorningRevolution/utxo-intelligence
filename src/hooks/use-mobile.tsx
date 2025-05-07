
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Initially set value based on window width
    const setInitialValue = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Use matchMedia API for better performance
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Handler function
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    
    // Set initial value
    setInitialValue()
    
    // Add listener
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange)
    } else {
      // Fallback for older browsers
      window.addEventListener("resize", setInitialValue)
    }
    
    // Clean up
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange)
      } else {
        window.removeEventListener("resize", setInitialValue)
      }
    }
  }, [])

  return !!isMobile
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState({
    isMobile: false,    // < 768px
    isTablet: false,    // 768px - 1023px
    isDesktop: false,   // >= 1024px
    isLargeDesktop: false // >= 1280px
  })

  React.useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    const desktopQuery = window.matchMedia('(min-width: 1024px)')
    const largeDesktopQuery = window.matchMedia('(min-width: 1280px)')
    
    const updateBreakpoints = () => {
      setBreakpoint({
        isMobile: mobileQuery.matches,
        isTablet: tabletQuery.matches,
        isDesktop: desktopQuery.matches,
        isLargeDesktop: largeDesktopQuery.matches
      })
    }
    
    // Initial check
    updateBreakpoints()
    
    // Event listeners
    mobileQuery.addEventListener('change', updateBreakpoints)
    tabletQuery.addEventListener('change', updateBreakpoints)
    desktopQuery.addEventListener('change', updateBreakpoints)
    largeDesktopQuery.addEventListener('change', updateBreakpoints)
    
    return () => {
      mobileQuery.removeEventListener('change', updateBreakpoints)
      tabletQuery.removeEventListener('change', updateBreakpoints)
      desktopQuery.removeEventListener('change', updateBreakpoints)
      largeDesktopQuery.removeEventListener('change', updateBreakpoints)
    }
  }, [])
  
  return breakpoint
}
