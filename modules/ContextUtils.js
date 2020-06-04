import React from 'react'
import invariant from 'invariant'
import PropTypes from 'prop-types'

// Works around issues with context updates failing to propagate.
// Caveat: the context value is expected to never change its identity.
// https://github.com/facebook/react/issues/2517
// https://github.com/reactjs/react-router/issues/470

const contextProviderShape = PropTypes.shape({
  subscribe: PropTypes.func.isRequired,
  eventIndex: PropTypes.number.isRequired
})

function makeContextName(name) {
  return `@@contextSubscriber/${name}`
}

export function CreateContextProvider(ComposedComponent, name, options) {
  const contextName = makeContextName(name)
  const listenersKey = `${contextName}/listeners`
  const eventIndexKey = `${contextName}/eventIndex`
  const subscribeKey = `${contextName}/subscribe`
  const withRef = options && options.withRef

  return class extends React.Component {
    static childContextTypes = {
      [contextName]: contextProviderShape.isRequired
    }

    constructor(props) {
      super(props)

      this[listenersKey] = []
      this[eventIndexKey] = 0
    }

    getChildContext() {
      return {
        [contextName]: {
          eventIndex: this[eventIndexKey],
          subscribe: this[subscribeKey]
        }
      }
    }

    componentDidUpdate() {
      this[eventIndexKey]++

      this[listenersKey].forEach(listener =>
        listener(this[eventIndexKey])
      )
    }

    getWrappedInstance = () => {
      invariant(
        withRef,
        'To access the wrapped instance, you need to specify ' +
        '`{ withRef: true }` as the second argument of the withRouter() call.'
      )
    }

    [subscribeKey] = (listener) => {
      // No need to immediately call listener here.
      this[listenersKey].push(listener)

      return () => {
        this[listenersKey] = this[listenersKey].filter(item =>
          item !== listener
        )
      }
    }

    render() {
      const props = { ...this.props }

      if (withRef) {
        props.withRef = (c) => {
          this.wrappedInstance = c
        }
      }

      return <ComposedComponent {...props} />
    }
  }
}

export function CreateContextSubscriber(ComposedComponent, name, options) {
  const contextName = makeContextName(name)
  const lastRenderedEventIndexKey = `${contextName}/lastRenderedEventIndex`
  const handleContextUpdateKey = `${contextName}/handleContextUpdate`
  const unsubscribeKey = `${contextName}/unsubscribe`
  const withRef = options && options.withRef

  return class extends React.Component {
    static displayName = `ContextSubscriberEnhancer(${ComposedComponent.displayName}, ${contextName})`;
    static contextTypes = {
      [contextName]: contextProviderShape
    }

    constructor(props, context) {
      super(props, context)

      if (!context[contextName]) {
        this.state = {}
      } else {
        this.state = {
          [lastRenderedEventIndexKey]: context[contextName].eventIndex
        }
      }
    }

    componentDidMount() {
      if (!this.context[contextName]) {
        return
      }

      this[unsubscribeKey] = this.context[contextName].subscribe(
        this[handleContextUpdateKey]
      )
    }
    
    // this method will be updated to UNSAFE_componentWillReceiveProps below for React versions >= 16.3
    componentDidUpdate() {
      if (!this.context[contextName]) {
        return
      }

      if (this.context[contextName].eventIndex !== this.state[lastRenderedEventIndexKey]) {
        this.setState({
          [lastRenderedEventIndexKey]: this.context[contextName].eventIndex
        })
      }
    }

    componentWillUnmount() {
      if (!this[unsubscribeKey]) {
        return
      }

      this[unsubscribeKey]()
      this[unsubscribeKey] = null
    }

    getWrappedInstance = () => {
      invariant(
        withRef,
        'To access the wrapped instance, you need to specify ' +
        '`{ withRef: true }` as the second argument of the withRouter() call.'
      )

      return this.wrappedInstance
    }

    [handleContextUpdateKey] = (eventIndex) => {
      if (eventIndex !== this.state[lastRenderedEventIndexKey]) {
        this.setState({ [lastRenderedEventIndexKey]: eventIndex })
      }
    }

    render() {
      const props = { ...this.props }
      if (withRef) {
        props.withRef = (c) => {
          this.wrappedInstance = c
        }
      }

      return <ComposedComponent {...props} />
    }
  }
}

// We are exporting this just to backward compatibility
export {
  ContextProvider,
  ContextSubscriber
} from './ContextUtilsMixins'
