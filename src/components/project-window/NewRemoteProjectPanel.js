import React, { Component } from 'react'

import LoginPanel from './LoginPanel'
import SelectRemoteProjectPanel from './SelectRemoteProjectPanel'

export default class NewRemoteProjectPanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            step: 0
        }
        this.state = this.initialState
    }

    render() {
        const { onClose } = this.props
        const { step } = this.state

        const onLoggedIn = () => {
            this.setState({...this.state, step: 1})
        }

        if( step === 0 ) {
            return <LoginPanel onClose={onClose} onLoggedIn={onLoggedIn}></LoginPanel>
        } else {
            return <SelectRemoteProjectPanel onClose={onClose}></SelectRemoteProjectPanel>
        }
    }
}
