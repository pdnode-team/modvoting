import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'admin/candidates': ExtractProps<(typeof import('../../inertia/pages/admin/candidates.tsx'))['default']>
    'admin/objections': ExtractProps<(typeof import('../../inertia/pages/admin/objections.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'results/show': ExtractProps<(typeof import('../../inertia/pages/results/show.tsx'))['default']>
    'verify/request': ExtractProps<(typeof import('../../inertia/pages/verify/request.tsx'))['default']>
  }
}
