import React, { Component } from 'react'
import hoistStatics from 'hoist-non-react-statics'
import { CreateContextSubscriber } from './ContextUtils'
import { routerShape } from './PropTypes'

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component'
}

export default function withRouter(WrappedComponent, options) {
  class WithRouter extends Component {
    static contextTypes = {
      router: routerShape
    }

    static propTypes = {
      router: routerShape
    }

    render() {
      const router = this.props.router || this.context.router
      if (!router) {
        return <WrappedComponent {...this.props} />
      }

      const { params, location, routes } = router
      const props = { ...this.props, router, params, location, routes }

      if (props.withRef) {
        props.ref = (c) => props.withRef(c)
      }

      return <WrappedComponent {...props} />
    }
  }

  const withRef = options && options.withRef
  const ContextWithRouter = CreateContextSubscriber(WithRouter, 'router', { withRef })

  ContextWithRouter.displayName = `withRouter(${getDisplayName(WrappedComponent)})`
  ContextWithRouter.WrappedComponent = WrappedComponent

  return hoistStatics(ContextWithRouter, WrappedComponent)
}
