import React, { Component } from 'react'
import { Button, Card, CardContent, Typography } from '@material-ui/core'

export default class SelectRemoteProjectPanel extends Component {

    renderProjectCard(project) {
        const { id, name, description } = project

        const onClick = () => {
            const { onOpenProject } = this.props
            onOpenProject(project)
        }

        const cardID = `project-${id}`

        return (
            <Card className="project-card" id={cardID} key={cardID} onClick={onClick} >
                <CardContent>
                    <Typography sx={{ fontSize: 14 }} color="textSecondary" gutterBottom>
                        { name }
                    </Typography>
                    <Typography component="p">
                        { description }
                    </Typography>
                </CardContent>
            </Card>
        )
    }

    render() {
        const { projects, onClose } = this.props

        if( !projects ) return null

        const projectCards = projects.map( (project) => {
            return this.renderProjectCard(project)
        })

        return (
            <div id="SelectRemoteProjectPanel">
                <Typography className="heading">Select an existing project from this server.</Typography>
                <div className="card-container">
                    { projectCards }
                </div>
                <div className='form-actions'>
                    <Button className='action-button' onClick={onClose} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }
}
