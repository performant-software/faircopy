import React, { Component } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import TEIGraph from '../tei-document/TEIGraph'

export default class GraphWindow extends Component {

    constructor() {
        super()
        this.state = {
            graphData: null,
            rootElement: "model.phrase", // "model.common", // "model.pLike", // "model.divLike", //"model.inter", //"model.divPart", //"model.phrase",  
            mode: "members",
            teiGraph: new TEIGraph()
        }	
    }
    
    componentDidMount() {
        const { teiGraph, rootElement, mode } = this.state
        teiGraph.load()
        const graphData = (mode === "members") ? teiGraph.graphMembers(rootElement,true) : teiGraph.graphMembership(rootElement)
        this.setState( { ...this.state, graphData } )
    }

    render() {
        const { graphData } = this.state
        if( !graphData ) return null
        return (
            <ForceGraph2D
                graphData={graphData}
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
