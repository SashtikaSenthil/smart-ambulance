import { useEffect, useRef, type CanvasHTMLAttributes, type RefObject } from 'react'
import Chart from 'chart.js/auto'
import type { ChartConfiguration } from 'chart.js'
import { useTheme } from '../../theme/themeContext'
import { applyChartDefaults, readChartTokens, type ChartTokens } from './chartTheme'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChart = Chart<any, any, any>

interface ChartCanvasProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'children'> {
  /** Builds the configuration from the current theme tokens (and the 2D context, for gradients). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createConfig: (tokens: ChartTokens, ctx: CanvasRenderingContext2D) => ChartConfiguration<any, any, any>
  /** Re-create the chart when any of these change (the theme is always included). */
  deps?: readonly unknown[]
  /** Receives the Chart instance for in-place data updates. */
  chartRef?: RefObject<AnyChart | null>
  /** Accessible description of what the chart shows. */
  label: string
}

/**
 * Chart.js canvas that follows the design tokens. The wrapper must give the canvas a
 * definite height (charts use maintainAspectRatio: false and fill their container).
 */
export function ChartCanvas({ createConfig, deps = [], chartRef, label, ...canvasProps }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const createConfigRef = useRef(createConfig)
  const { resolved } = useTheme()

  useEffect(() => {
    createConfigRef.current = createConfig
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let chart: AnyChart | null = null
    try {
      // Never let a stale instance block the canvas (e.g. after an interrupted teardown).
      Chart.getChart(canvas)?.destroy()
      const tokens = readChartTokens(canvas)
      applyChartDefaults(tokens)
      const config = createConfigRef.current(tokens, ctx)
      config.options = { responsive: true, maintainAspectRatio: false, ...config.options }
      chart = new Chart(canvas, config)
      if (chartRef) chartRef.current = chart
    } catch (error) {
      console.error('Failed to initialise chart:', error)
    }

    return () => {
      try {
        chart?.destroy()
      } catch (error) {
        console.warn('Chart teardown failed:', error)
      }
      if (chartRef) chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, ...deps])

  // Absolutely positioned so the canvas never feeds back into its container's size
  // (aspect-ratio / fixed-height wrappers stay exact; the wrapper must be `relative`).
  const { className, ...rest } = canvasProps
  return <canvas ref={canvasRef} role="img" aria-label={label} className={['absolute inset-0', className].filter(Boolean).join(' ')} {...rest} />
}

export type { AnyChart }
