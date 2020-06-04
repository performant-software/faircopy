import React, { Component } from 'react'
import OpenSeadragon from 'openseadragon';
import axios from 'axios';
import SeaDragonComponent from './SeaDragonComponent';

export default class FacsEditor extends Component {

    componentWillUnmount() {
        if(typeof this.viewer !== 'undefined'){
            this.viewer.destroy();
        }    
    }

    loadFolio = (el) => {
		const url = 'https://ids.lib.harvard.edu/ids/iiif/47174896/info.json'

		this.viewer = OpenSeadragon({
            element: el
        });
        
		axios.get(url).then(
			(resp) => {
				this.viewer.addTiledImage({
					tileSource: resp.data
				});
			},
			(error) => {
				console.log('Unable to load image: ' + error);
			}
		);
	}
    
    render() {
        const { hidden } = this.props

        const style = hidden ? { display: 'none' } : {}

        return (
            <div id="FacsEditor" style={style} >
                <SeaDragonComponent loadFolio={this.loadFolio} ></SeaDragonComponent>
            </div>
        )
    }
}
