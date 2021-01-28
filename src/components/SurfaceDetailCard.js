import React, { Component } from 'react'
import { Button, Typography, Card, CardHeader, CardActions, CardContent } from '@material-ui/core'

import IDField from './attribute-fields/IDField'

import { getLocalString } from '../tei-document/iiif'

export default class SurfaceDetailCard extends Component {

    renderSubHeadings(subHeadings) {
        if( !subHeadings || subHeadings.length === 0 ) return null

        const subHeadingEls = []
        let n = 0
        for( const subHeading of subHeadings ) {
            subHeadingEls.push(
                <Typography
                    key={`subheading-${n++}`}
                >
                    {subHeading}
                </Typography>
            )
        }

        return ( <div>{ subHeadingEls }</div>)
    }

    render() {
        const { facsDocument, surfaceIndex, changeSurfaceIndex, onChangeSurface } = this.props
        const surface = facsDocument.getSurface(surfaceIndex)
        const {surfaces} = facsDocument.facs

        const enablePrev = surfaceIndex > 0
        const enableNext = surfaceIndex < surfaces.length-1

        const labels = getLocalString(surface.localLabels, 'en')
        const title = labels[0]
        const subHeadings = labels.slice(1)

        const onPrev = () => {
            if(enablePrev) {
                changeSurfaceIndex( surfaceIndex - 1 )
            }
        }

        const onNext = () => {
            if(enableNext) {
                changeSurfaceIndex( surfaceIndex + 1 )
            }
        }

        const onChangeID = (value,error) => onChangeSurface('id',value,error)

        return (
            <Card id="SurfaceDetailCard" >
                <CardHeader 
                    title={title}
                    className="nav-controls"
                >
                </CardHeader>
                <CardContent>
                    <IDField
                        hasID={facsDocument.hasID}
                        value={surface.id}
                        onChangeCallback={onChangeID}
                    ></IDField>
                    { this.renderSubHeadings(subHeadings) }
                </CardContent>
                <CardActions>
                    <Button disabled={!enablePrev} onClick={onPrev} className='prev-nav-button'><i className='fas fa-chevron-circle-left fa-2x'></i></Button>
                    <Button disabled={!enableNext} onClick={onNext} className='next-nav-button'><i className='fas fa-chevron-circle-right fa-2x'></i></Button>
                </CardActions>
            </Card>
        )
    }
}