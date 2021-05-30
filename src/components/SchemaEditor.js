import React, { Component } from 'react'

import ElementTree from './ElementTree'

export default class SchemaEditor extends Component {

    render() {
        const { fairCopyConfig } = this.props

        const elementGroups = fairCopyConfig.menus['structure']

        return (
            <div id="SchemaEditor">
                <ElementTree
                    elementGroups={elementGroups}
                ></ElementTree>
            </div>
        )
        // <ElementInspector></ElementInspector>
        // <ElementLibrary></ElementLibrary>
    }
}
