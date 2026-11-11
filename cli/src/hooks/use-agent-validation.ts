import { validateAgents } from '@methatech/sdk'
import { useCallback, useState } from 'react'

import { getAuthToken, getUserCredentials } from '../utils/auth'
import { loadAgentDefinitions } from '../utils/local-agent-registry'
import { hasSelectedByokConnection } from '../utils/byok'
import { getSelectedFreebuffModel } from '../state/freebuff-model-store'
import { IS_FREEBUFF } from '../utils/constants'
import { isMethatechModelId } from '@methatech/common/constants/methatech-models'
import { logger } from '../utils/logger'

import type { AgentDefinition } from '@methatech/sdk'

export type ValidationError = {
  id: string
  message: string
}

export type ValidationCheckResult = {
  success: boolean
  errors: ValidationError[]
}

/** BYOK runs validate local agent definitions without sending them to Freebuff. */
export const shouldValidateAgentsRemotely = (
  isFreebuff = IS_FREEBUFF,
): boolean =>
  !isFreebuff ||
  (!hasSelectedByokConnection() && !hasMethatechSession(isFreebuff))

/**
 * The MethaTech panel session is active: a panel model is selected and the
 * user is logged in (device-code session). Same reason as BYOK above: the
 * panel is not the Freebuff backend and holds no spawnable-agent database
 * to validate against, so the session path validates agent definitions
 * LOCALLY (the SDK's built-in Zod validation, which still runs and can
 * still fail the send) instead of calling the Freebuff-only
 * /api/agents/validate endpoint. The panel deliberately does NOT implement
 * that endpoint — a stub returning empty errors would claim a validation
 * it does not perform.
 */
export const hasMethatechSession = (isFreebuff = IS_FREEBUFF): boolean =>
  isFreebuff &&
  isMethatechModelId(getSelectedFreebuffModel()) &&
  getUserCredentials()?.authToken !== undefined

/**
 * Invoke SDK validation using the inference source selected when a send starts.
 * The auth token rides along so a logged-in CLI behind a shared NAT is
 * admitted on its own per-user budget once the endpoint's per-IP budget is
 * spent; the endpoint itself stays anonymous.
 */
export const validateSelectedAgentDefinitions = (
  agentDefinitions: AgentDefinition[],
  options?: { isFreebuff?: boolean },
) =>
  validateAgents(agentDefinitions, {
    remote: shouldValidateAgentsRemotely(options?.isFreebuff),
    apiKey: getAuthToken(),
  })

type UseAgentValidationResult = {
  validationErrors: ValidationError[]
  isValidating: boolean
  validate: () => Promise<ValidationCheckResult>
}

/**
 * Hook that provides agent validation functionality.
 * Call validate() manually to trigger validation (e.g., on message send).
 */
export const useAgentValidation = (): UseAgentValidationResult => {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  )
  const [isValidating, setIsValidating] = useState(false)

  // Validate agents and update state
  // Returns validation result with success status and any errors
  const validate = useCallback(async (): Promise<ValidationCheckResult> => {
    setIsValidating(true)

    try {
      const agentDefinitions = loadAgentDefinitions()

      // Read selection at send time so changing provider never leaves a stale
      // render using the hosted validation endpoint.
      const validationResult = await validateSelectedAgentDefinitions(
        agentDefinitions,
      )

      if (validationResult.success) {
        setValidationErrors([])
        return { success: true, errors: [] }
      } else {
        // Transport failures block the send too; retain the reason for the UI
        // and diagnostics instead of silently aborting with an empty error list.
        setValidationErrors(validationResult.validationErrors)
        return { success: false, errors: validationResult.validationErrors }
      }
    } catch (error) {
      logger.error({ error }, 'Agent validation failed with exception')
      const errors = [
        {
          id: 'validation_error',
          message: error instanceof Error ? error.message : String(error),
        },
      ]
      setValidationErrors(errors)
      return { success: false, errors }
    } finally {
      setIsValidating(false)
    }
  }, [])

  return {
    validationErrors,
    isValidating,
    validate,
  }
}
