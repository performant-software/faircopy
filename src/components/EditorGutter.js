import React, { Component } from 'react';

const gutterTop = 60

export default class EditorGutter extends Component {

    componentDidMount() {
        window.addEventListener("resize", this.updateDimensions)
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.updateDimensions)
    }

    updateDimensions = () => {
        this.forceUpdate()
    }

    renderGutterMarkers() {
        const { editorView } = this.props
        const editorState = editorView.state

        // {"doc":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"AAALorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu orci consectetur, tempor sem non, dignissim sem. Ut finibus euismod neque quis congue. Sed porta, quam a suscipit tincidunt, nisl justo sagittis metus, in gravida ante erat ut ante. Nam molestie tortor ante, sit amet accumsan lectus euismod eget. Maecenas fermentum, neque eu tincidunt consectetur, justo erat vestibulum odio, a laoreet lacus libero eget leo. Phasellus sed dictum elit, ac eleifend erat. Suspendisse potenti. Quisque euismod nisi nec fermentum consectetur. Etiam sagittis risus eget purus commodo porta. Nullam vulputate pellentesque ligula, vitae vehicula nisi tristique eu. Sed placerat tincidunt lacus in euismod. Nulla tempus nibh a est pretium iaculis. Proin cursus dolor quis nisl sodales ullamcorper. Quisque ac nunc eu quam cursus fringilla. Nulla condimentum suscipit quam ac iaculis."}]},{"type":"paragraph","content":[{"type":"text","text":"BBBLorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu orci consectetur, tempor sem non, dignissim sem. Ut finibus euismod neque quis congue. Sed porta, quam a suscipit tincidunt, nisl justo sagittis metus, in gravida ante erat ut ante. Nam molestie tortor ante, sit amet accumsan lectus euismod eget. Maecenas fermentum, neque eu tincidunt consectetur, justo erat vestibulum odio, a laoreet lacus libero eget leo. Phasellus sed dictum elit, ac eleifend erat. Suspendisse potenti. Quisque euismod nisi nec fermentum consectetur. Etiam sagittis risus eget purus commodo porta. Nullam vulputate pellentesque ligula, vitae vehicula nisi tristique eu. Sed placerat tincidunt lacus in euismod. Nulla tempus nibh a est pretium iaculis. Proin cursus dolor quis nisl sodales ullamcorper. Quisque ac nunc eu quam cursus fringilla. Nulla condimentum suscipit quam ac iaculis."}]}]},"selection":{"type":"text","anchor":1761,"head":1761}}

        const gutterMarks = []
        editorState.doc.descendants( (node,pos) => {
            if( node.type.name === 'paragraph' ) {
                const startCoords = editorView.coordsAtPos(pos)
                const endCoords = editorView.coordsAtPos(pos + node.nodeSize)
                const top = startCoords.top - gutterTop
                const height = endCoords.bottom - startCoords.top - 8 
                const markStyle = { top, height }
                const markKey = `gutter-mark-${gutterMarks.length}`
                gutterMarks.push(
                    <div key={markKey} style={markStyle} className='paragraph-marker'></div>
                )                        
                return false
            }
            return true
        })

        return gutterMarks
    }

    render() {   
        if( !this.props.editorView ) return null

        return (
            <div className='EditorGutter'>
                { this.renderGutterMarkers() }
            </div>
        ) 
    }
}
