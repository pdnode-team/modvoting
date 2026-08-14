/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'verify.show': {
    methods: ["GET","HEAD"],
    pattern: '/verify',
    tokens: [{"old":"/verify","type":0,"val":"verify","end":""}],
    types: placeholder as Registry['verify.show']['types'],
  },
  'verify.request': {
    methods: ["POST"],
    pattern: '/verify/request',
    tokens: [{"old":"/verify/request","type":0,"val":"verify","end":""},{"old":"/verify/request","type":0,"val":"request","end":""}],
    types: placeholder as Registry['verify.request']['types'],
  },
  'verify.confirm': {
    methods: ["GET","HEAD"],
    pattern: '/verify/confirm',
    tokens: [{"old":"/verify/confirm","type":0,"val":"verify","end":""},{"old":"/verify/confirm","type":0,"val":"confirm","end":""}],
    types: placeholder as Registry['verify.confirm']['types'],
  },
  'campaigns.store': {
    methods: ["POST"],
    pattern: '/rounds/:id/campaigns',
    tokens: [{"old":"/rounds/:id/campaigns","type":0,"val":"rounds","end":""},{"old":"/rounds/:id/campaigns","type":1,"val":"id","end":""},{"old":"/rounds/:id/campaigns","type":0,"val":"campaigns","end":""}],
    types: placeholder as Registry['campaigns.store']['types'],
  },
  'votes.store': {
    methods: ["POST"],
    pattern: '/rounds/:id/votes',
    tokens: [{"old":"/rounds/:id/votes","type":0,"val":"rounds","end":""},{"old":"/rounds/:id/votes","type":1,"val":"id","end":""},{"old":"/rounds/:id/votes","type":0,"val":"votes","end":""}],
    types: placeholder as Registry['votes.store']['types'],
  },
  'objections.store': {
    methods: ["POST"],
    pattern: '/rounds/:id/objections',
    tokens: [{"old":"/rounds/:id/objections","type":0,"val":"rounds","end":""},{"old":"/rounds/:id/objections","type":1,"val":"id","end":""},{"old":"/rounds/:id/objections","type":0,"val":"objections","end":""}],
    types: placeholder as Registry['objections.store']['types'],
  },
  'results.show': {
    methods: ["GET","HEAD"],
    pattern: '/results',
    tokens: [{"old":"/results","type":0,"val":"results","end":""}],
    types: placeholder as Registry['results.show']['types'],
  },
  'admin.objections.index': {
    methods: ["GET","HEAD"],
    pattern: '/admin/objections',
    tokens: [{"old":"/admin/objections","type":0,"val":"admin","end":""},{"old":"/admin/objections","type":0,"val":"objections","end":""}],
    types: placeholder as Registry['admin.objections.index']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
