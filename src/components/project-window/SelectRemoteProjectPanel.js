import React, { Component } from 'react'
import { Card, CardContent, Typography } from '@material-ui/core'

export default class SelectRemoteProjectPanel extends Component {

    renderProjectCard(project) {
        const { id, name, description } = project

        const onClick = () => {
            const { onOpenProject } = this.props
            onOpenProject(project)
        }

        return (
            <Card className="project-card" id={`project-${id}`} onClick={onClick} >
                <CardContent>
                    <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                        { name["en"].translation }
                    </Typography>
                    <Typography variant="h5" component="div">
                        { description["en"].translation }
                    </Typography>
                </CardContent>
            </Card>
        )
    }

    render() {
        const { projects } = this.props

        if( !projects ) return null

        const projectCards = projects.map( (project) => {
            return this.renderProjectCard(project)
        })

        const s = projects.length > 1 ? 's' : ''

        return (
            <div id="SelectRemoteProjectPanel">
                <Typography>{projects.length} project{s} available on this server.</Typography>
                { projectCards }
            </div>
        )
    }
}
