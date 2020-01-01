import React, { Component } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const fs = window.fairCopy.fs

export default class GraphWindow extends Component {

    constructor() {
        super()
        this.state = {
            data: null
        }	
    }

    componentDidMount() {
        const data = JSON.parse(fs.readFileSync('test-docs/miserable.json', "utf8"))
        this.setState( { data } )
    }

    render() {
        const { data } = this.state
        if( !data ) return null
        return (
            <ForceGraph2D
                graphData={data}
                nodeAutoColorBy="group"
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.id;
                    const fontSize = 12/globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = node.color;
                    ctx.fillText(label, node.x, node.y);
                }}
            />
        )
    }
    
}
