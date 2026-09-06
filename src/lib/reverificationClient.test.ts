import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/reverificationActions', () => ({
  verifySensitiveActionPassword: vi.fn(),
}))

import { verifySensitiveActionPassword } from '@/app/reverificationActions'
import {
  registerReverificationPrompt,
  REVERIFICATION_REQUIRED_MESSAGE,
  runWithReverification,
  runReverifiedAction,
} from './reverificationClient'

const verifyPassword = vi.mocked(verifySensitiveActionPassword)
let unregisterPrompt: (() => void) | null = null

afterEach(() => {
  unregisterPrompt?.()
  unregisterPrompt = null
  vi.clearAllMocks()
})

describe('runWithReverification', () => {
  it('returns cancellation and network failures to the form without losing its state', async () => {
    unregisterPrompt = registerReverificationPrompt(async () => null)
    expect(await runReverifiedAction(async () => ({ success: false, error: REVERIFICATION_REQUIRED_MESSAGE })))
      .toEqual({ success: false, error: 'Re-verification was cancelled.' })
    expect(await runReverifiedAction(async () => { throw new Error('Network unavailable') }))
      .toEqual({ success: false, error: 'Network unavailable' })
  })
  it('prompts, verifies, and retries a server action that returns the zero-trust error', async () => {
    const prompt = vi.fn(async () => 'password123')
    unregisterPrompt = registerReverificationPrompt(prompt)
    verifyPassword.mockResolvedValue({ success: true })

    const operation = vi.fn()
      .mockResolvedValueOnce({ success: false, error: REVERIFICATION_REQUIRED_MESSAGE })
      .mockResolvedValueOnce({ success: true })

    const result = await runWithReverification(
      operation,
      (response: { success: boolean; error?: string }) => response.success ? null : response.error
    )

    expect(prompt).toHaveBeenCalledOnce()
    expect(verifyPassword).toHaveBeenCalledWith({ password: 'password123' })
    expect(operation).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ success: true })
  })

  it('does not prompt for an ordinary server-action error', async () => {
    const prompt = vi.fn(async () => 'password123')
    unregisterPrompt = registerReverificationPrompt(prompt)
    const operation = vi.fn(async () => ({ success: false, error: 'Event not found.' }))

    const result = await runWithReverification(
      operation,
      (response: { success: boolean; error?: string }) => response.success ? null : response.error
    )

    expect(prompt).not.toHaveBeenCalled()
    expect(verifyPassword).not.toHaveBeenCalled()
    expect(operation).toHaveBeenCalledOnce()
    expect(result).toEqual({ success: false, error: 'Event not found.' })
  })

  it('does not retry when verification is cancelled', async () => {
    unregisterPrompt = registerReverificationPrompt(async () => null)
    const operation = vi.fn(async () => ({ success: false, error: REVERIFICATION_REQUIRED_MESSAGE }))

    await expect(runWithReverification(
      operation,
      (response: { success: boolean; error?: string }) => response.success ? null : response.error
    )).rejects.toThrow('Re-verification was cancelled.')

    expect(operation).toHaveBeenCalledOnce()
    expect(verifyPassword).not.toHaveBeenCalled()
  })
})
