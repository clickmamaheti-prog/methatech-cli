import { mimoModels } from '@methatech/common/constants/model-config'

import { createBase2 } from './base2'

const definition = {
  ...createBase2('default', {
    model: mimoModels.mimoV25Pro,
  }),
  id: 'base2-mimo',
  displayName: 'MethaTech MiMo Orchestrator',
}

export default definition
