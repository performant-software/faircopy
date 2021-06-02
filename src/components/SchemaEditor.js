import React, { Component } from 'react'

import ElementTree from './ElementTree'
import ElementInspector from './ElementInspector'
import ElementLibrary from './ElementLibrary'

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
                <div className="top">
                    <div className="top-left">
                        <ElementTree
                            elementGroups={elementGroups}
                            onSelect={onSelect}
                        ></ElementTree>
                    </div>
                    <div className="top-right">
                        <ElementLibrary
                            teiSchema={teiSchema}
                        ></ElementLibrary>
                    </div>
                </div>
                <div className="bottom">
                    <ElementInspector
                        teiSchema={teiSchema}
                        elements={fairCopyConfig.elements}
                        elementID={selectedElement}
                    ></ElementInspector>
                </div>
            </div>
        )
    }
}
