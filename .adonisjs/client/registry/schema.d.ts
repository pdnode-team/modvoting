/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['show']>>>
    }
  }
  'verify.show': {
    methods: ["GET","HEAD"]
    pattern: '/verify'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/verify_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/verify_controller').default['show']>>>
    }
  }
  'verify.request': {
    methods: ["POST"]
    pattern: '/verify/request'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/verify').verifyRequestValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/verify').verifyRequestValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/verify_controller').default['request']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/verify_controller').default['request']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'verify.confirm': {
    methods: ["GET","HEAD"]
    pattern: '/verify/confirm'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/verify_controller').default['confirm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/verify_controller').default['confirm']>>>
    }
  }
  'campaigns.store': {
    methods: ["POST"]
    pattern: '/rounds/:id/campaigns'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/campaign').campaignValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/campaign').campaignValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/campaign_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/campaign_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'votes.store': {
    methods: ["POST"]
    pattern: '/rounds/:id/votes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vote').voteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/vote').voteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/vote_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/vote_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'objections.store': {
    methods: ["POST"]
    pattern: '/rounds/:id/objections'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/objection').objectionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/objection').objectionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/objection_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/objection_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'results.show': {
    methods: ["GET","HEAD"]
    pattern: '/results'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/results_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/results_controller').default['show']>>>
    }
  }
  'admin.objections.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/objections'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_objections_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_objections_controller').default['index']>>>
    }
  }
  'admin.candidates.index': {
    methods: ["GET","HEAD"]
    pattern: '/admin/candidates'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_candidates_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_candidates_controller').default['index']>>>
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
}
