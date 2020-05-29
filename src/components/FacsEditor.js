import React, { Component } from 'react'
import OpenSeadragonViewer from "openseadragon-react-viewer"

export default class FacsEditor extends Component {

    render() {
        const manifestUrl = 'https://iiif.stack.rdc.library.northwestern.edu/public/f9/12/a5/81/-d/9e/8-/43/d6/-a/7c/8-/a8/d4/6e/ff/75/17-manifest.json?manifest=https://iiif.stack.rdc.library.northwestern.edu/public/f9/12/a5/81/-d/9e/8-/43/d6/-a/7c/8-/a8/d4/6e/ff/75/17-manifest.json'

        return (
            <div className="FacsEditor">
                <OpenSeadragonViewer manifestUrl={manifestUrl} />
            </div>
        )
    }
   
}
