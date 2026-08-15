/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.get('/', [controllers.Home, 'show']).as('home')

// 免登录邮箱验证
router.get('verify', [controllers.Verify, 'show']).as('verify.show')
router.post('verify/request', [controllers.Verify, 'request']).as('verify.request')
router.get('verify/confirm', [controllers.Verify, 'confirm']).as('verify.confirm')

// 选举动作（需邮箱验证登录）
router
  .group(() => {
    router.post('rounds/:id/campaigns', [controllers.Campaign, 'store']).as('campaigns.store')
    router.post('rounds/:id/votes', [controllers.Vote, 'store']).as('votes.store')
    router.post('rounds/:id/objections', [controllers.Objection, 'store']).as('objections.store')
  })
  .use(middleware.auth())

// 结果与异议管理
router.get('results', [controllers.Results, 'show']).as('results.show')
router
  .get('admin/objections', [controllers.AdminObjections, 'index'])
  .use(middleware.auth())
  .use(middleware.authorize('admin.manage_objections'))
  .as('admin.objections.index')

router
  .get('admin/candidates', [controllers.AdminCandidates, 'index'])
  .use(middleware.auth())
  .use(middleware.authorize('admin.manage_objections'))
  .as('admin.candidates.index')

router.post('logout', [controllers.Session, 'destroy']).use(middleware.auth()).as('session.destroy')
