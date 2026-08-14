import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('home')
  }
}
