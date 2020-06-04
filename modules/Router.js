import invariant from 'invariant'
import React, { Component } from 'react'
import { func, object } from 'prop-types'

import createTransitionManager from './createTransitionManager'
import { routes } from './InternalPropTypes'
import RouterContext from './RouterContext'
import { createRoutes } from './RouteUtils'
import { createRouterObject, assignRouterState } from './RouterUtils'
import warning from './routerWarning'

const propTypes = {
  history: object,
  children: routes,
  routes, // alias for children
  render: func,
  createElement: func,
  onError: func,
  onUpdate: func,

  // PRIVATE: For client-side rehydration of server match.
  matchContext: object
}

/**
 * A <Router> is a high-level API for automatically setting up
 * a router that renders a <RouterContext> with all the props
 * it needs each time the URL changes.
 */
class Router extends Component {
  static displayName = 'Router'

  static propTypes = propTypes

  static defaultProps = {
    render: (props) => <RouterContext {...props} />
  }

  constructor(props) {
    super(props)
    this.state =  {
      location: null,
      routes: null,
      params: null,
      components: null
    }

    this.handleError = this.handleError.bind(this)
    this.createRouterObject = this.createRouterObject.bind(this)
    this.createTransitionManager = this.createTransitionManager.bind(this)

    this.transitionManager = this.createTransitionManager()
    this.router = this.createRouterObject(this.state)
  }

  handleError(error) {
    if (this.props.onError) {
      this.props.onError.call(this, error)
    } else {
      // Throw errors by default so we don't silently swallow them!
      throw error // This error probably occurred in getChildRoutes or getComponents.
    }
  }

  createRouterObject(state) {
    const { matchContext } = this.props
    if (matchContext) {
      return matchContext.router
    }

    const { history } = this.props
    return createRouterObject(history, this.transitionManager, state)
  }

  createTransitionManager() {
    const { matchContext } = this.props
    if (matchContext) {
      return matchContext.transitionManager
    }

    const { history } = this.props
    const { routes, children } = this.props

    invariant(
      history.getCurrentLocation,
      'You have provided a history object created with history v4.x or v2.x ' +
        'and earlier. This version of React Router is only compatible with v3 ' +
        'history objects. Please change to history v3.x.'
    )

    return createTransitionManager(
      history,
      createRoutes(routes || children)
    )
  }

  // this method will be updated to UNSAFE_componentWillMount below for React versions >= 16.3
  UNSAFE_componentWillMount() {
    if (!this._unlisten) {
      this._unlisten = this.transitionManager.listen((error, state) => {
        if (error) {
          this.handleError(error)
        } else {
          // Keep the identity of this.router because of a caveat in ContextUtils:
          // they only work if the object identity is preserved.
          assignRouterState(this.router, state)
          this.setState(state, this.props.onUpdate)
        }
      })
    }
  }

  // this method will be updated to UNSAFE_componentWillReceiveProps below for React versions >= 16.3
  /* istanbul ignore next: sanity check */
  componentDidUpdate(prevProps) {
    warning(
      prevProps.history === this.props.history,
      'You cannot change <Router history>; it will be ignored'
    )

    warning(
      (prevProps.routes || prevProps.children) ===
        (this.props.routes || this.props.children),
      'You cannot change <Router routes>; it will be ignored'
    )
  }

  componentWillUnmount() {
    if (this._unlisten)
      this._unlisten()
  }

  render() {
    const { location, routes, params, components } = this.state
    const { createElement, render, ...props } = this.props

    if (location == null)
      return null // Async match

    // Only forward non-Router-specific props to routing context, as those are
    // the only ones that might be custom routing context props.
    Object.keys(propTypes).forEach(propType => delete props[propType])

    return render({
      ...props,
      router: this.router,
      location,
      routes,
      params,
      components,
      createElement
    })
  }
}

export default Router
