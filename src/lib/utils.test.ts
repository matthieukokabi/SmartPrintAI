import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('px-2', 'py-2', false && 'hidden', 'px-4')).toBe('py-2 px-4')
  })

  it('handles conditional and array values', () => {
    expect(cn(['text-sm', null], undefined, 'font-bold')).toBe('text-sm font-bold')
  })
})
