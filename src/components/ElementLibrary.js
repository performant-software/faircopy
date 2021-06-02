import { Typography } from '@material-ui/core'
import React, { Component } from 'react'


export default class ElementLibrary extends Component {

    render() {
        const { teiSchema } = this.props

        const elements = []
        for( const element of Object.values(teiSchema.elements) ) {
            const { name } = element
            const key = `element-${name}`
            elements.push(<div className="element-item" key={key}><Typography>{name}</Typography></div>)
        }

        return (
            <div id="ElementLibrary">
                <Typography>TEI Elements</Typography>
                <div className="elements">
                    { elements }
                </div>
            </div>
        )
    }
}