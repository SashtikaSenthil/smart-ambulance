import { motion, type HTMLMotionProps } from 'motion/react'
import { EASE_OUT } from './motion'


interface RevealProps extends HTMLMotionProps<'div'> {
  delay?: number
  /** Distance in px the block rises while fading in. */
  offset?: number
}

/**
 * Fades + rises a block into place the first time it scrolls into view.
 * Communicates reading order on long clinical pages; transform is dropped
 * automatically under prefers-reduced-motion (MotionConfig reducedMotion="user").
 */
export function Reveal({ delay = 0, offset = 14, children, ...rest }: RevealProps) {
  return (
    <motion.div
      data-reveal
      initial={{ opacity: 0, y: offset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
