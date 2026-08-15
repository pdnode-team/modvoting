import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'verify.show': { paramsTuple?: []; params?: {} }
    'verify.request': { paramsTuple?: []; params?: {} }
    'verify.confirm': { paramsTuple?: []; params?: {} }
    'campaigns.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'votes.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'objections.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'results.show': { paramsTuple?: []; params?: {} }
    'admin.objections.index': { paramsTuple?: []; params?: {} }
    'admin.candidates.index': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'verify.show': { paramsTuple?: []; params?: {} }
    'verify.confirm': { paramsTuple?: []; params?: {} }
    'results.show': { paramsTuple?: []; params?: {} }
    'admin.objections.index': { paramsTuple?: []; params?: {} }
    'admin.candidates.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'verify.show': { paramsTuple?: []; params?: {} }
    'verify.confirm': { paramsTuple?: []; params?: {} }
    'results.show': { paramsTuple?: []; params?: {} }
    'admin.objections.index': { paramsTuple?: []; params?: {} }
    'admin.candidates.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'verify.request': { paramsTuple?: []; params?: {} }
    'campaigns.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'votes.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'objections.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}