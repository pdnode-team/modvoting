import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { AuthorizationResponse, errors } from '@adonisjs/bouncer'
import { permissions, type PermissionKey } from '#start/permissions'

export default class AuthorizeMiddleware {
  protected createAccessDeniedResponse() {
    return AuthorizationResponse.deny('Access denied', 403)
  }

  async handle(ctx: HttpContext, next: NextFn, ability: PermissionKey | PermissionKey[]) {
    const user = ctx.auth.user
    if (!user) {
      throw new errors.E_AUTHORIZATION_FAILURE(this.createAccessDeniedResponse())
    }

    const access = await permissions.createAccessFor(user)

    const allowed = Array.isArray(ability)
      ? ability.some((a) => access.allows(a))
      : access.allows(ability)

    if (!allowed) {
      throw new errors.E_AUTHORIZATION_FAILURE(this.createAccessDeniedResponse())
    }
    return next()
  }
}
