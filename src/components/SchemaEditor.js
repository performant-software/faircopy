import React, { Component } from 'react'

import ElementTree from './ElementTree'
import ElementInspector from './ElementInspector'

export default class SchemaEditor extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedElement: null
        }
    }

    render() {
        const { fairCopyConfig, teiSchema } = this.props
        const { selectedElement } = this.state
        const elementGroups = fairCopyConfig.menus['structure']

        const onSelect = (elementID) => {
            this.setState({...this.state, selectedElement: elementID })
        }

        return (
            <div id="SchemaEditor">
                <ElementTree
                    elementGroups={elementGroups}
                    onSelect={onSelect}
                ></ElementTree>
                <ElementInspector
                    teiSchema={teiSchema}
                    elements={fairCopyConfig.elements}
                    elementID={selectedElement}
                ></ElementInspector>
            </div>
        )
        // <ElementLibrary></ElementLibrary>
    }
}
