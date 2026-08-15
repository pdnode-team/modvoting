/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
  verify: {
    show: typeof routes['verify.show']
    request: typeof routes['verify.request']
    confirm: typeof routes['verify.confirm']
  }
  campaigns: {
    store: typeof routes['campaigns.store']
  }
  votes: {
    store: typeof routes['votes.store']
  }
  objections: {
    store: typeof routes['objections.store']
  }
  results: {
    show: typeof routes['results.show']
  }
  admin: {
    objections: {
      index: typeof routes['admin.objections.index']
    }
    candidates: {
      index: typeof routes['admin.candidates.index']
    }
  }
  session: {
    destroy: typeof routes['session.destroy']
  }
}
